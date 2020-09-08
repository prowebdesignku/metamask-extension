import nanoid from 'nanoid'

const DEFAULT_CATEGORY = '*'
const APPROVAL_INFO_KEY = 'info'
const APPROVAL_CALLBACKS_KEY = '_callbacks'

/**
 * Data associated with a pending approval.
 * @typedef {Object} ApprovalInfo
 * @property {string} origin - The origin of the approval request.
 * @property {string|'*'} category - The category associated with the
 * approval request. The default category is '*'.
 */

/**
 * Controller for keeping track of pending approvals by id and/or origin and
 * category pair.
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
   * There can only be one approval per origin and category. An implicit,
   * default category will be used if none is specified.
   *
   * @param {Object} approvalData - Data associated with the approval request.
   * @param {string} [approvalData.id] - The id of the approval request.
   * Generated randomly if not specified.
   * @param {string} approvalData.origin - The origin of the approval request.
   * @param {string} [approvalData.category] - The category associated with the
   * approval request, if applicable.
   * @returns {Array.<{approvalPromise: Promise, id: string}>} The id and the
   * approval promise.
   */
  add ({ id = nanoid(), origin, category = DEFAULT_CATEGORY } = {}) {
    // input validation
    if (!category) {
      throw new Error('May not specify falsy category.')
    }
    if (!origin) {
      throw new Error('Expected origin to be specified.')
    }

    // ensure no approvals exist for given arguments
    if (this._approvals.has(id)) {
      throw new Error(`Pending approval with id '${id}' already exists.`)
    }
    if (this._origins?.[origin]?.[category] !== undefined) {
      throw new Error(`Origin '${origin}' already has pending approval${
        category === DEFAULT_CATEGORY ? '.' : ` for category '${category}'.`}`)
    }

    // add pending approval
    const approvalPromise = new Promise((resolve, reject) => {
      this._approvals.set(id, {
        [APPROVAL_INFO_KEY]: { origin, category },
        [APPROVAL_CALLBACKS_KEY]: { resolve, reject },
      })
    })
    this._addPendingApprovalOrigin(origin, category)
    return [approvalPromise, id]
  }

  /**
   * Adds an entry to _origins.
   * Performs no validation.
   *
   * @private
   * @param {string} origin - The origin of the approval request.
   * @param {string} category - The category associated with the
   * approval request.
   */
  _addPendingApprovalOrigin (origin, category) {
    if (!this._origins[origin]) {
      this._origins[origin] = {}
    }

    this._origins[origin][category] = true
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
   * Checks if there's a pending approval request for the given id, or origin
   * and category pair if no id is specified.
   * If no category is specified, the default category will be used.
   *
   * @param {Object} args - Options bag.
   * @param {string} [args.id] - The id of the approval request.
   * @param {string} [args.origin] - The origin of the approval request.
   * @param {string} [args.category] - The category of the approval request.
   * @returns {boolean} True if an approval is found, false otherwise.
   */
  has ({ id, origin, category = DEFAULT_CATEGORY } = {}) {
    if (!category) {
      throw new Error('May not specify falsy category.')
    }

    if (id) {
      return this._approvals.has(id)
    } else if (origin) {
      return Boolean(this._origins?.[origin]?.[category])
    }
    throw new Error('Expected id or origin to be specified.')
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
      category,
    } = this.get(id) || {}

    if (origin && category) {
      delete this._origins?.[origin]?.[category]
      if (this._isEmptyOrigin(origin)) {
        delete this._origins[origin]
      }
    }
    this._approvals.delete(id)
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

  /**
   * Rejects and deletes all pending approval requests.
   */
  clear () {
    for (const id of this._approvals.keys()) {
      this.reject(id)
    }
    this._origins = {}
  }
}
