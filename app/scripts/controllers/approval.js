import nanoid from 'nanoid'

const DEFAULT_TYPE = '*'
const APPROVAL_INFO_KEY = 'info'
const APPROVAL_CALLBACKS_KEY = '_callbacks'

/**
 * Data associated with a pending approval.
 * @typedef {Object} ApprovalInfo
 * @property {string} origin - The origin of the approval request.
 * @property {string|'*'} type - The type associated with the approval request.
 * The default type is '*'.
 */

/**
 * Controller for keeping track of pending approvals by id and/or origin and
 * type pair.
 *
 * Useful for managing requests that require user approval, and restricting
 * the number of approvals a particular origin can have pending at any one time.
 */
export class ApprovalController {

  constructor () {

    /** @private */
    this._approvals = new Map()

    /** @private */
    this._origins = {}
  }

  /**
   * Adds a pending approval per the given arguments, and returns the
   * associated id and approval promise.
   * There can only be one approval per origin and type. An implicit,
   * default type will be used if none is specified.
   *
   * @param {Object} approvalData - Data associated with the approval request.
   * @param {string} [approvalData.id] - The id of the approval request.
   * Generated randomly if not specified.
   * @param {string} approvalData.origin - The origin of the approval request.
   * @param {string} [approvalData.type] - The type associated with the
   * approval request, if applicable.
   * @returns {Array.<{approvalPromise: Promise, id: string}>} The id and the
   * approval promise.
   */
  add ({ id = nanoid(), origin, type = DEFAULT_TYPE } = {}) {
    // input validation
    if (!type) {
      throw new Error('May not specify falsy type.')
    }
    if (!origin) {
      throw new Error('Expected origin to be specified.')
    }

    // ensure no approvals exist for given arguments
    if (this._approvals.has(id)) {
      throw new Error(`Pending approval with id '${id}' already exists.`)
    }
    if (this._origins?.[origin]?.[type] !== undefined) {
      throw new Error(`Origin '${origin}' already has pending approval${
        type === DEFAULT_TYPE ? '.' : ` for type '${type}'.`}`)
    }

    // add pending approval
    const approvalPromise = new Promise((resolve, reject) => {
      this._approvals.set(id, {
        [APPROVAL_INFO_KEY]: { origin, type },
        [APPROVAL_CALLBACKS_KEY]: { resolve, reject },
      })
    })
    this._addPendingApprovalOrigin(origin, type)
    return [approvalPromise, id]
  }

  /**
   * Approves the approval with the given id, and deletes the approval.
   * Throws an error if no such approval exists.
   *
   * @param {string} id - The id of the approval request.
   */
  approve (id) {
    this._deleteApprovalAndGetCallbacks(id).resolve()
  }

  /**
   * Rejects the approval with the given id, and deletes the approval.
   * Throws an error if no such approval exists.
   *
   * @param {string} id - The id of the approval request.
   */
  reject (id) {
    this._deleteApprovalAndGetCallbacks(id).reject()
  }

  /**
   * Gets the pending approval info for the given id.
   *
   * @param {string} id - The id of the approval request.
   * @returns {ApprovalInfo|undefined} The pending approval data associated with
   * the id.
   */
  get (id) {
    return this._approvals.get(id)?.[APPROVAL_INFO_KEY]
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
      return Boolean(this._origins?.[origin]?.[type])
    }
    throw new Error('Expected id or origin to be specified.')
  }

  /**
   * Rejects and deletes all pending approval requests.
   */
  clear () {
    for (const id of this._approvals.keys()) {
      this.reject(id)
    }
    this._origins = {}
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
   * Gets the pending approval callbacks for the given id.
   * Performs no validation.
   *
   * @private
   * @param {string} id - The id of the approval request.
   * @returns {Object|undefined} An object with the approval's resolve and reject
   * callbacks.
   */
  _getApprovalCallbacks (id) {
    return this._approvals.get(id)[APPROVAL_CALLBACKS_KEY]
  }

  /**
   * Deletes the approval with the given id. The approval promise must be
   * resolved or reject before this method is called.
   * Deletion is an internal operation because approval state is wholly and
   * solely managed by this controller.
   *
   * @private
   * @param {string} id - The id of the approval request to be deleted.
   */
  _delete (id) {
    if (!id) {
      throw new Error('Expected id to be specified.')
    }

    const {
      origin,
      type,
    } = this.get(id) || {}

    if (origin && type) {
      delete this._origins?.[origin]?.[type]
      if (this._isEmptyOrigin(origin)) {
        delete this._origins[origin]
      }
    }
    this._approvals.delete(id)
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
    const callbacks = this._getApprovalCallbacks(id)
    this._delete(id)
    return callbacks
  }

  /**
   * Internal function for checking if there are no pending approvals
   * associated with the given origin.
   *
   * @private
   * @param {string} origin - The origin to check.
   * @returns {boolean} True if the origin has no pending approvals, false
   * otherwise.
   */
  _isEmptyOrigin (origin) {
    return (
      !this._origins[origin] ||
      Object.keys(this._origins[origin]).length === 0
    )
  }
}
