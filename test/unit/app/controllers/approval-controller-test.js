import { strict as assert } from 'assert'
import sinon from 'sinon'

import ApprovalController
  from '../../../../app/scripts/controllers/approval'

describe('approval controller', function () {

  describe('add', function () {

    let approvalController

    beforeEach(function () {
      approvalController = new ApprovalController()
    })

    it('adds correctly specified entry', function () {
      assert.doesNotThrow(
        () => approvalController.add('foo', 'bar.baz'),
        'should add entry',
      )

      assert.ok(
        approvalController.has({ id: 'foo' }),
        'should have added entry',
      )
    })

    it('adds correctly specified entry with custom type', function () {
      assert.doesNotThrow(
        () => approvalController.add('foo', 'bar.baz', 'myType'),
      )

      assert.ok(
        approvalController.has({ id: 'foo' }),
        'should have added entry',
      )
      assert.ok(
        approvalController.has({ origin: 'bar.baz', type: 'myType' }),
        'should have added entry',
      )
    })

    it('adds multiple entries for same origin with different types and ids', function () {

      const ORIGIN = 'bar.baz'

      assert.doesNotThrow(
        () => approvalController.add('foo1', ORIGIN),
        'should add entry',
      )
      assert.doesNotThrow(
        () => approvalController.add('foo2', ORIGIN, 'myType1'),
        'should add entry',
      )
      assert.doesNotThrow(
        () => approvalController.add('foo3', ORIGIN, 'myType2'),
        'should add entry',
      )

      assert.ok(
        approvalController.has({ id: 'foo1' }) &&
        approvalController.has({ id: 'foo3' }) &&
        approvalController.has({ id: 'foo3' }),
        'should have added entries',
      )
      assert.ok(
        approvalController.has({ origin: ORIGIN }) &&
        approvalController.has({ origin: ORIGIN, type: 'myType1' }) &&
        approvalController.has({ origin: ORIGIN, type: 'myType2' }),
        'should have added entries',
      )
    })

    it('throws on id collision', function () {
      assert.doesNotThrow(
        () => approvalController.add('foo', 'bar.baz'),
        'should add entry',
      )

      assert.throws(
        () => approvalController.add('foo', 'fizz.buzz'),
        getIdCollisionError('foo'),
        'should have thrown expected error',
      )
    })

    it('throws on origin and default type collision', function () {
      assert.doesNotThrow(
        () => approvalController.add('foo', 'bar.baz'),
        'should add entry',
      )

      assert.throws(
        () => approvalController.add('foo1', 'bar.baz'),
        getOriginTypeCollisionError('bar.baz'),
        'should have thrown expected error',
      )
    })

    it('throws on origin and custom type collision', function () {
      assert.doesNotThrow(
        () => approvalController.add('foo', 'bar.baz', 'myType'),
        'should add entry',
      )

      assert.throws(
        () => approvalController.add('foo1', 'bar.baz', 'myType'),
        getOriginTypeCollisionError('bar.baz', 'myType'),
        'should have thrown expected error',
      )
    })

    it('validates input', function () {
      assert.throws(
        () => approvalController.add(),
        getMissingIdAndOriginError(),
        'should throw on falsy id and origin',
      )

      assert.throws(
        () => approvalController.add('foo'),
        getMissingIdAndOriginError(),
        'should throw on falsy origin',
      )

      assert.throws(
        () => approvalController.add('foo', 'bar.baz', null),
        getNoFalsyTypeError(),
        'should throw on falsy type',
      )
    })
  })

  describe('get', function () {

    let approvalController

    beforeEach(function () {
      approvalController = new ApprovalController()
    })

    it('gets entry with default type', function () {
      approvalController.add('foo', 'bar.baz')

      assert.deepEqual(
        approvalController.get('foo'), { origin: 'bar.baz' },
        'should retrieve expected entry',
      )
    })

    it('gets entry with custom type', function () {
      approvalController.add('foo', 'bar.baz', 'myType')

      assert.deepEqual(
        approvalController.get('foo'), { origin: 'bar.baz', type: 'myType' },
        'should retrieve expected entry',
      )
    })

    it('returns undefined for non-existing entry', function () {
      approvalController.add('foo', 'bar.baz')

      assert.equal(
        approvalController.get('fizz'),
        undefined,
        'should return undefined',
      )

      assert.equal(
        approvalController.get(),
        undefined,
        'should return undefined',
      )

      assert.equal(
        approvalController.get({}),
        undefined,
        'should return undefined',
      )
    })
  })

  describe('has', function () {

    let approvalController

    beforeEach(function () {
      approvalController = new ApprovalController()
    })

    it('returns true for existing entry by id', function () {
      approvalController.add('foo', 'bar.baz')

      assert.equal(
        approvalController.has({ id: 'foo' }),
        true,
        'should return true for existing entry by id',
      )
    })

    it('returns true for existing entry by origin', function () {
      approvalController.add('foo', 'bar.baz')

      assert.equal(
        approvalController.has({ origin: 'bar.baz' }),
        true,
        'should return true for existing entry by origin',
      )
    })

    it('returns true for existing entry by origin and custom type', function () {
      approvalController.add('foo', 'bar.baz', 'myType')

      assert.equal(
        approvalController.has({ origin: 'bar.baz', type: 'myType' }),
        true,
        'should return true for existing entry by origin and custom type',
      )
    })

    it('returns false for non-existing entry by id', function () {
      approvalController.add('foo', 'bar.baz')

      assert.equal(
        approvalController.has({ id: 'fizz' }),
        false,
        'should return false for non-existing entry by id',
      )
    })

    it('returns false for non-existing entry by origin', function () {
      approvalController.add('foo', 'bar.baz')

      assert.equal(
        approvalController.has({ origin: 'fizz.buzz' }),
        false,
        'should return false for non-existing entry by origin',
      )
    })

    it('returns false for non-existing entry by origin and type', function () {
      approvalController.add('foo', 'bar.baz')

      assert.equal(
        approvalController.has({ origin: 'bar.baz', type: 'myType' }),
        false,
        'should return false for non-existing entry by origin and type',
      )
    })

    it('validates input', function () {
      assert.throws(
        () => approvalController.has({}),
        getMissingIdOrOriginError(),
        'should throw on falsy id and origin',
      )

      assert.throws(
        () => approvalController.has({ type: false }),
        getNoFalsyTypeError(),
        'should throw on falsy type',
      )
    })
  })

  // We test this internal function before resolve, reject, and clear because
  // they are heavily dependent upon it.
  describe('_delete', function () {

    let approvalController

    beforeEach(function () {
      approvalController = new ApprovalController()
    })

    it('deletes entry', function () {
      approvalController.add('foo', 'bar.baz')

      approvalController._delete('foo')

      assert.ok(
        (
          !approvalController.has({ id: 'foo' }) &&
          !approvalController.has({ origin: 'bar.baz' })
        ),
        'should have deleted entry',
      )
    })

    it('deletes one entry out of many without side-effects', function () {
      approvalController.add('foo', 'bar.baz')
      approvalController.add('fizz', 'bar.baz', 'myType')

      approvalController._delete('fizz')

      assert.ok(
        (
          !approvalController.has({ id: 'fizz' }) &&
          !approvalController.has({ origin: 'bar.baz', type: 'myType' })
        ),
        'should have deleted entry',
      )

      assert.ok(
        (
          approvalController.has({ id: 'foo' }) &&
          approvalController.has({ origin: 'bar.baz' })
        ),
        'should still have non-deleted entry',
      )
    })

    it('does nothing when deleting non-existing entry', function () {
      approvalController.add('foo', 'bar.baz')

      assert.doesNotThrow(
        () => approvalController._delete('fizz'),
        'should not throw when deleting non-existing entry',
      )

      assert.ok(
        (
          approvalController.has({ id: 'foo' }) &&
          approvalController.has({ origin: 'bar.baz' })
        ),
        'should still have non-deleted entry',
      )
    })

    it('validates input', function () {
      assert.throws(
        () => approvalController._delete(),
        getError('Expected id to be specified.'),
        'should throw on falsy id',
      )
    })
  })

  describe('resolve', function () {

    let approvalController, numDeletions

    beforeEach(function () {
      approvalController = new ApprovalController()
      sinon.spy(approvalController, '_delete')
      numDeletions = 0
    })

    afterEach(function () {
      assert.equal(
        approvalController._delete.callCount, numDeletions,
        `should have called '_delete' ${numDeletions} times`,
      )
    })

    it('resolves approval promise', async function () {
      numDeletions = 1

      const approvalPromise = approvalController.add('foo', 'bar.baz')
      approvalController.resolve('foo', 'success')

      const result = await approvalPromise
      assert.equal(
        result, 'success',
        'should have resolved expected value',
      )
    })

    it('resolves multiple approval promises out of order', async function () {
      numDeletions = 2

      const approvalPromise1 = approvalController.add('foo1', 'bar.baz')
      const approvalPromise2 = approvalController.add('foo2', 'bar.baz', 'myType2')

      approvalController.resolve('foo2', 'success2')

      let result = await approvalPromise2
      assert.equal(
        result, 'success2',
        'should have resolved expected value',
      )

      approvalController.resolve('foo1', 'success1')

      result = await approvalPromise1
      assert.equal(
        result, 'success1',
        'should have resolved expected value',
      )
    })

    it('throws on unknown id', function () {
      assert.throws(
        () => approvalController.resolve('foo'),
        getIdNotFoundError('foo'),
        'should reject on unknown id',
      )
    })
  })

  describe('reject', function () {

    let approvalController, numDeletions

    beforeEach(function () {
      approvalController = new ApprovalController()
      sinon.spy(approvalController, '_delete')
      numDeletions = 0
    })

    afterEach(function () {
      assert.equal(
        approvalController._delete.callCount, numDeletions,
        `should have called '_delete' ${numDeletions} times`,
      )
    })

    it('rejects approval promise', async function () {
      numDeletions = 1

      const approvalPromise = assert.rejects(
        () => approvalController.add('foo', 'bar.baz'),
        getError('failure'),
        'should reject with expected error',
      )
      approvalController.reject('foo', new Error('failure'))

      await approvalPromise
    })

    it('rejects multiple approval promises out of order', async function () {
      numDeletions = 2

      const rejectionPromise1 = assert.rejects(
        () => approvalController.add('foo1', 'bar.baz'),
        getError('failure1'),
        'should reject with expected error',
      )
      const rejectionPromise2 = assert.rejects(
        () => approvalController.add('foo2', 'bar.baz', 'myType2'),
        getError('failure2'),
        'should reject with expected error',
      )

      approvalController.reject('foo2', new Error('failure2'))
      await rejectionPromise2

      approvalController.reject('foo1', new Error('failure1'))
      await rejectionPromise1
    })

    it('throws on unknown id', function () {
      assert.throws(
        () => approvalController.reject('foo'),
        getIdNotFoundError('foo'),
        'should reject on unknown id',
      )
    })
  })

  describe('resolve and reject', function () {

    it('resolves and rejects multiple approval promises out of order', async function () {
      const approvalController = new ApprovalController()
      sinon.spy(approvalController, '_delete')

      const promise1 = approvalController.add('foo1', 'bar.baz')
      const promise2 = approvalController.add('foo2', 'bar.baz', 'myType2')
      const promise3 = assert.rejects(
        () => approvalController.add('foo3', 'fizz.buzz'),
        getError('failure3'),
        'should reject with expected error',
      )
      const promise4 = assert.rejects(
        () => approvalController.add('foo4', 'bar.baz', 'myType4'),
        getError('failure4'),
        'should reject with expected error',
      )

      approvalController.resolve('foo2', 'success2')

      let result = await promise2
      assert.equal(
        result, 'success2',
        'should have resolved expected value',
      )

      approvalController.reject('foo4', new Error('failure4'))
      await promise4

      approvalController.reject('foo3', new Error('failure3'))
      await promise3

      assert.ok(
        approvalController._isEmptyOrigin('fizz.buzz'),
        'should not have deleted origin',
      )
      assert.ok(
        !approvalController._isEmptyOrigin('bar.baz'),
        'should have origin with remaining approval',
      )

      approvalController.resolve('foo1', 'success1')

      result = await promise1
      assert.equal(
        result, 'success1',
        'should have resolved expected value',
      )

      assert.ok(
        approvalController._isEmptyOrigin('bar.baz'),
        'origins should be removed',
      )

      assert.equal(
        approvalController._delete.callCount, 4,
        `should have called '_delete' 4 times`,
      )
    })
  })

  describe('clear', function () {

    let approvalController, numDeletions

    beforeEach(function () {
      approvalController = new ApprovalController()
      sinon.spy(approvalController, '_delete')
      numDeletions = 0
    })

    afterEach(function () {
      assert.equal(
        approvalController._delete.callCount, numDeletions,
        `should have called '_delete' ${numDeletions} times`,
      )
    })

    it('does nothing if state is already empty', function () {
      assert.doesNotThrow(
        () => approvalController.clear(),
        'should not throw',
      )
    })

    it('deletes existing entries', async function () {
      numDeletions = 3

      const clearPromise = Promise.all([
        assert.rejects(
          () => approvalController.add('foo1', 'bar.baz'),
          'every approval promise should reject',
        ),
        assert.rejects(
          () => approvalController.add('foo2', 'bar.baz', 'myType'),
          'every approval promise should reject',
        ),
        assert.rejects(
          () => approvalController.add('foo3', 'fizz.buzz', 'myType'),
          'every approval promise should reject',
        ),
      ])

      approvalController.clear()
      await clearPromise

      assert.equal(
        approvalController._approvals.size, 0,
        '_approvals should be empty',
      )
      assert.equal(
        Object.keys(approvalController._origins).length, 0,
        '_origins should be empty',
      )
    })
  })
})

// helpers

function getNoFalsyTypeError () {
  return getError('May not specify falsy type.')
}

function getMissingIdAndOriginError () {
  return getError('Expected id and origin to be specified.')
}

function getIdCollisionError (id) {
  return getError(`Approval with id '${id}' already exists.`)
}

function getOriginTypeCollisionError (origin, type = '_default') {
  const message = `Origin '${origin}' already has pending approval${
    type === '_default' ? '.' : ` for type '${type}'.`}`
  return getError(message)
}

function getMissingIdOrOriginError () {
  return getError('Expected id or origin to be specified.')
}

function getIdNotFoundError (id) {
  return getError(`Approval with id '${id}' not found.`)
}

function getError (message) {
  return {
    name: 'Error',
    message,
  }
}
