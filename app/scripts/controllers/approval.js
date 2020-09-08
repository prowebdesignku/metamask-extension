import nanoid from 'nanoid'

const DEFAULT_CATEGORY = '*'

/**
 * Data associated with a pending approval.
 * @typedef {Object} ApprovalObject
 * @property {string} origin - The origin of the approval request.
 * @property {string|'*'} category - The category associated with the
 * approval request. The default category is '*'.
 * @property {Function} resolve - The promise resolution callback associated
 * with the approval request.
 * @property {Function} reject - The promise rejection callback associated
 * with the approval request.
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
    this._pendingApprovals = new Map()
    this._pendingApprovalOrigins = {}
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
    if (!origin || !resolve || !reject) {
      throw new Error('Expected origin, resolve, and reject to be specified.')
    }

    // ensure no approvals exist for given arguments
    if (this._pendingApprovals.has(id)) {
      throw new Error(`Pending approval with id '${id}' already exists.`)
    }
    if (this._pendingApprovalOrigins?.[origin]?.[category] !== undefined) {
      throw new Error(`Origin '${origin}' already has pending approval${
        category === DEFAULT_CATEGORY ? '.' : ` for category '${category}'.`}`)
    }

    // add pending approval
    const approvalPromise = new Promise((resolve, reject) => {
      this._pendingApprovals.set(id, { origin, category, resolve, reject })
    })
    this._addPendingApprovalOrigin(origin, category)
    return [ approvalPromise, id ]
  }

  /**
   * Internal method for adding an entry to _pendingApprovalOrigins.
   * Performs no validation.
   * 
   * @param {string} origin - The origin of the approval request.
   * @param {string} category - The category associated with the
   * approval request, if applicable.
   */
  _addPendingApprovalOrigin (origin, category) {
    if (!this._pendingApprovalOrigins[origin]) {
      this._pendingApprovalOrigins[origin] = {}
    }

    this._pendingApprovalOrigins[origin][category] = true
  }

  /**
   * Gets the pending approval with the given id.
   * 
   * @param {string} id - The id of the approval request.
   * @returns {ApprovalObject|undefined} The pending approval object associated with
   * the id.
   */
  get (id) {
    return this._pendingApprovals.get(id)
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
      return this._pendingApprovals.has(id)
    } else if (origin) {
      return Boolean(this._pendingApprovalOrigins?.[origin]?.[category])
    }
    throw new Error('Expected id or origin to be specified.')
  }

  /**
   * Deletes the pending approval with the given id.
   * 
   * @param {string} id - The id of the approval request.
   * @returns {boolean} True if an approval was deleted, false otherwise (i.e.
   * no such approval was found).
   */
  delete (id) {
    if (id) {
      const { origin, category } = this._pendingApprovals.get(id) || {}
      if (origin && category) {
        delete this._pendingApprovalOrigins?.[origin]?.[category]
        if (this._isEmptyOrigin(origin)) {
          delete this._pendingApprovalOrigins[origin]
        }
      }
      return this._pendingApprovals.delete(id)
    }
    throw new Error('Expected id to be specified.')
  }

  /**
   * Internal function for checking if there are no pending approvals
   * associated with the given origin.
   * 
   * @param {string} origin - The origin to check.
   * @returns {boolean} True if the origin has no pending approvals, false
   * otherwise.
   */
  _isEmptyOrigin (origin) {
    return (
      !this._pendingApprovalOrigins[origin] ||
      Object.keys(this._pendingApprovalOrigins[origin]).length === 0
    )
  }

  /**
   * Rejects and deletes all pending approval requests.
   */
  clear () {
    for (let approval of this._pendingApprovals.values()) {
      approval.reject()
    }
    this._pendingApprovals.clear()
    this._pendingApprovalOrigins = {}
  }
}
