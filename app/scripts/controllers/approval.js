import { ethErrors } from 'eth-json-rpc-errors'
import nanoid from 'nanoid'
import ObservableStore from 'obs-store'

const DEFAULT_TYPE = Symbol('DEFAULT_APPROVAL_TYPE')
const STORE_KEY = 'pendingApprovals'

const getAlreadyPendingMessage = (origin, type) => (
  `Request ${type === DEFAULT_TYPE ? '' : `of type '${type}' `}already pending for origin ${origin}. Please wait.`
)

/**
 * Data associated with a pending approval.
 * @typedef {Object} ApprovalInfo
 * @property {string} origin - The origin of the approval request.
 * @property {string} [type] - The type associated with the approval request,
 * if any.
 * @property {Object} requestData - The request data associated with the
 * approval request, if any.
 */

/**
 * Controller for keeping track of pending approvals by id and/or origin and
 * type pair.
 *
 * Useful for managing requests that require user approval, and restricting
 * the number of approvals a particular origin can have pending at any one time.
 */
export default class ApprovalController {

  /**
   * @param {Object} opts - Options bag
   * @param {Function} opts.showApprovalRequest - Function for opening the
   * MetaMask user confirmation UI.
   */
  constructor ({ showApprovalRequest } = {}) {

    /** @private */
    this._approvals = new Map()

    /** @private */
    this._origins = {}

    /** @private */
    this._showApprovalRequest = showApprovalRequest

    this.store = new ObservableStore({ [STORE_KEY]: {} })
  }

  /**
   * Adds a pending approval per the given arguments, opens the MetaMask user
   * confirmation UI, and returns the associated id and approval promise.
   * An internal, default type will be used if none is specified.
   *
   * There can only be one approval per origin and type. An error is thrown if
   * attempting
   *
   * @param {Object} opts - Options bag.
   * @param {string} opts.[id] - The id of the approval request. A random id
   * will be generated if none is provided.
   * @param {string} opts.origin - The origin of the approval request.
   * @param {string} opts.[type] - The type associated with the approval request,
   * if applicable.
   * @param {Object} opts.[requestData] - The request data associated with the
   * approval request.
   * @returns {Promise} The approval promise.
   */
  addAndShowApprovalRequest ({ id, origin, type, requestData } = {}) {
    const promise = this._add(id, origin, type, requestData)
    this._showApprovalRequest()
    return promise
  }

  /**
   * Adds a pending approval per the given arguments, and returns the associated
   * id and approval promise. An internal, default type will be used if none is
   * specified.
   *
   * There can only be one approval per origin and type. An error is thrown if
   * attempting
   *
   * @param {Object} opts - Options bag.
   * @param {string} opts.[id] - The id of the approval request. A random id
   * will be generated if none is provided.
   * @param {string} opts.origin - The origin of the approval request.
   * @param {string} opts.[type] - The type associated with the approval request,
   * if applicable.
   * @param {Object} opts.[requestData] - The request data associated with the
   * approval request.
   * @returns {Promise} The approval promise.
   */
  add ({ id, origin, type, requestData } = {}) {
    return this._add(id, origin, type, requestData)
  }

  /**
   * Gets the pending approval info for the given id.
   *
   * @param {string} id - The id of the approval request.
   * @returns {ApprovalInfo|undefined} The pending approval data associated with
   * the id.
   */
  get (id) {
    const info = this.store.getState()[STORE_KEY][id]
    return info
      ? { ...info }
      : undefined
  }

  /**
   * Checks if there's a pending approval request for the given id, or origin
   * and type pair if no id is specified.
   * If no type is specified, the default type will be used.
   *
   * @param {Object} args - Options bag.
   * @param {string} [args.id] - The id of the approval request.
   * @param {string} [args.origin] - The origin of the approval request.
   * @param {string} [args.type] - The type of the approval request.
   * @returns {boolean} True if an approval is found, false otherwise.
   */
  has ({ id, origin, type = DEFAULT_TYPE } = {}) {
    if (!type) {
      throw new Error('May not specify falsy type.')
    }

    if (id) {
      return this._approvals.has(id)
    } else if (origin) {
      return Boolean(this._origins[origin]?.[type])
    }
    throw new Error('Must specify id or origin.')
  }

  /**
   * Resolves the promise of the approval with the given id, and deletes the
   * approval. Throws an error if no such approval exists.
   *
   * @param {string} id - The id of the approval request.
   * @param {any} value - The value to resolve the approval promise with.
   */
  resolve (id, value) {
    this._deleteApprovalAndGetCallbacks(id).resolve(value)
  }

  /**
   * Rejects the promise of the approval with the given id, and deletes the
   * approval. Throws an error if no such approval exists.
   *
   * @param {string} id - The id of the approval request.
   * @param {Error} error - The error to reject the approval promise with.
   */
  reject (id, error) {
    this._deleteApprovalAndGetCallbacks(id).reject(error)
  }

  /**
   * Rejects and deletes all pending approval requests.
   */
  clear () {
    for (const id of this._approvals.keys()) {
      this.reject(id)
    }
    this._origins = {}
    this.store.putState({ [STORE_KEY]: {} })
  }

  /**
   * Implementation of add operation.
   *
   * @private
   * @param {string} [id] - The id of the approval request.
   * @param {string} origin - The origin of the approval request.
   * @param {string} [type] - The type associated with the approval request,
   * if applicable.
   * @param {Object} [requestData] - The request data associated with the
   * approval request.
   * @returns {Promise} The approval promise.
   */
  _add (id = nanoid(), origin, type = DEFAULT_TYPE, requestData) {
    this._validateAddParams(id, origin, type, requestData)

    if (this._origins[origin]?.[type]) {
      throw ethErrors.rpc.resourceUnavailable(
        getAlreadyPendingMessage(origin, type),
      )
    }

    // add pending approval
    return new Promise((resolve, reject) => {
      this._approvals.set(id, { resolve, reject })
      this._addPendingApprovalOrigin(origin, type)
      this._addToStore(id, origin, type, requestData)
    })
  }

  /**
   * Validates parameters to the add method.
   *
   * @private
   * @param {string} id - The id of the approval request.
   * @param {string} origin - The origin of the approval request.
   * @param {string} type - The type associated with the approval request.
   * @param {Object} [requestData] - The request data associated with the
   * approval request.
   */
  _validateAddParams (id, origin, type, requestData) {
    let errorMessage = null
    if (!id && id !== undefined) {
      errorMessage = 'May not specify falsy id.'
    } else if (!origin) {
      errorMessage = 'Must specify origin.'
    } else if (this._approvals.has(id)) {
      errorMessage = `Approval with id '${id}' already exists.`
    } else if (!type) {
      errorMessage = 'May not specify falsy type.'
    } else if (requestData && (
      typeof requestData !== 'object' || Array.isArray(requestData)
    )) {
      errorMessage = 'Request data must be a plain object if specified.'
    }

    if (errorMessage) {
      throw ethErrors.rpc.internal(errorMessage)
    }
  }

  /**
   * Adds an entry to _origins.
   * Performs no validation.
   *
   * @private
   * @param {string} origin - The origin of the approval request.
   * @param {string} type - The type associated with the
   * approval request.
   */
  _addPendingApprovalOrigin (origin, type) {
    if (!this._origins[origin]) {
      this._origins[origin] = {}
    }
    this._origins[origin][type] = true
  }

  /**
   * Adds an entry to the store.
   * Performs no validation.
   *
   * @private
   * @param {string} id - The id of the approval request.
   * @param {string} origin - The origin of the approval request.
   * @param {string} type - The type associated with the approval request.
   * @param {Object} [requestData] - The request data associated with the
   * approval request.
   */
  _addToStore (id, origin, type, requestData) {
    const info = { id, origin }
    // default type is for internal bookkeeping only
    if (type !== DEFAULT_TYPE) {
      info.type = type
    }
    if (requestData) {
      info.requestData = requestData
    }

    this.store.putState({
      [STORE_KEY]: {
        ...this.store.getState()[STORE_KEY],
        [id]: info,
      },
    })
  }

  /**
   * Deletes the approval with the given id. The approval promise must be
   * resolved or reject before this method is called.
   * Deletion is an internal operation because approval state is solely
   * managed by this controller.
   *
   * @private
   * @param {string} id - The id of the approval request to be deleted.
   */
  _delete (id) {
    if (!id) {
      throw new Error('Expected id to be specified.')
    }

    if (this._approvals.has(id)) {
      this._approvals.delete(id)

      const state = this.store.getState()[STORE_KEY]
      const {
        origin,
        type = DEFAULT_TYPE,
      } = state[id] || {}

      delete this._origins[origin]?.[type]
      if (this._isEmptyOrigin(origin)) {
        delete this._origins[origin]
      }

      const newState = { ...state }
      delete newState[id]
      this.store.putState({
        [STORE_KEY]: newState,
      })
    }
  }

  /**
   * Gets the approval callbacks for the given id, deletes the entry, and then
   * returns the callbacks for promise resolution.
   * Throws an error if no approval is found for the given id.
   *
   * @private
   * @param {string} id - The id of the approval request.
   * @returns {Object|undefined} The pending approval data associated with
   * the id.
   */
  _deleteApprovalAndGetCallbacks (id) {
    if (!this._approvals.has(id)) {
      throw new Error(`Approval with id '${id}' not found.`)
    }
    const callbacks = this._approvals.get(id)
    this._delete(id)
    return callbacks
  }

  /**
   * Checks whether there are any pending approvals associated with the given
   * origin.
   *
   * @private
   * @param {string} origin - The origin to check.
   * @returns {boolean} True if the origin has no pending approvals, false
   * otherwise.
   */
  _isEmptyOrigin (origin) {
    return (
      !this._origins[origin] ||
      (
        !this._origins[origin][DEFAULT_TYPE] && // symbols are non-enumerable
        Object.keys(this._origins[origin]).length === 0
      )
    )
  }
}
