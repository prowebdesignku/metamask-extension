import { strict as assert } from 'assert'
import migration48 from '../../../app/scripts/migrations/048'

const localhostNetwork = {
  rpcUrl: 'http://localhost:8545',
  chainId: '0x539',
  ticker: 'ETH',
  nickname: 'Localhost 8545',
  rpcPrefs: {},
}
const expectedPreferencesState = {
  PreferencesController: {
    frequentRpcListDetail: [{
      ...localhostNetwork,
    }],
  },
}

describe('migration #48', function () {
  it('should update the version metadata', async function () {
    const oldStorage = {
      'meta': {
        'version': 47,
      },
      'data': {},
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.meta, {
      'version': 48,
    })
  })

  it('should delete NetworkController.settings', async function () {
    const oldStorage = {
      meta: {},
      data: {
        NetworkController: {
          settings: {
            fizz: 'buzz',
          },
          provider: {
            type: 'notRpc',
          },
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      NetworkController: {
        provider: {
          type: 'notRpc',
        },
      },
      foo: 'bar',
    })
  })

  it('should migrate NetworkController.provider to Rinkeby if the type is "rpc" and the chainId is invalid (1)', async function () {
    const oldStorage = {
      meta: {},
      data: {
        NetworkController: {
          provider: {
            type: 'rpc',
            chainId: 'foo',
            fizz: 'buzz',
          },
          foo: 'bar',
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      NetworkController: {
        provider: {
          type: 'rinkeby',
          rpcUrl: '',
          chainId: '0x4',
          nickname: '',
          rpcPrefs: {},
          ticker: 'ETH',
        },
        foo: 'bar',
      },
      foo: 'bar',
    })
  })

  it('should migrate NetworkController.provider to Rinkeby if the type is "rpc" and the chainId is invalid (2)', async function () {
    const oldStorage = {
      meta: {},
      data: {
        NetworkController: {
          provider: {
            type: 'rpc',
            chainId: '0x01',
            fizz: 'buzz',
          },
          foo: 'bar',
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      NetworkController: {
        provider: {
          type: 'rinkeby',
          rpcUrl: '',
          chainId: '0x4',
          nickname: '',
          rpcPrefs: {},
          ticker: 'ETH',
        },
        foo: 'bar',
      },
      foo: 'bar',
    })
  })

  it('should not migrate NetworkController.provider to Rinkeby if the type is "rpc" and the chainId is valid', async function () {
    const oldStorage = {
      meta: {},
      data: {
        NetworkController: {
          provider: {
            type: 'rpc',
            chainId: '0x1',
            fizz: 'buzz',
          },
          foo: 'bar',
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      NetworkController: {
        provider: {
          type: 'rpc',
          chainId: '0x1',
          fizz: 'buzz',
        },
        foo: 'bar',
      },
      foo: 'bar',
    })
  })

  it('should migrate NetworkController.provider to Rinkeby if the type is "localhost"', async function () {
    const oldStorage = {
      meta: {},
      data: {
        NetworkController: {
          provider: {
            type: 'localhost',
            fizz: 'buzz',
          },
          foo: 'bar',
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      NetworkController: {
        provider: {
          type: 'rinkeby',
          rpcUrl: '',
          chainId: '0x4',
          nickname: '',
          rpcPrefs: {},
          ticker: 'ETH',
        },
        foo: 'bar',
      },
      foo: 'bar',
    })
  })

  it('should re-key NetworkController.provider.rpcTarget to rpcUrl if the type is not "rpc" or "localhost"', async function () {
    const oldStorage = {
      meta: {},
      data: {
        NetworkController: {
          provider: {
            type: 'someType',
            rpcTarget: 'foo.xyz',
            fizz: 'buzz',
          },
          foo: 'bar',
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      NetworkController: {
        foo: 'bar',
        provider: {
          type: 'someType',
          rpcUrl: 'foo.xyz',
          fizz: 'buzz',
        },
      },
      foo: 'bar',
    })
  })

  it('should do nothing to NetworkController if affected state does not exist', async function () {
    const oldStorage = {
      meta: {},
      data: {
        NetworkController: {
          provider: {
            type: 'notRpc',
          },
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(
      { ...oldStorage.data, ...expectedPreferencesState },
      { ...newStorage.data, ...expectedPreferencesState },
    )
  })

  it('should add frequentRpcListDetail item to beginning of list', async function () {
    const existingList = [
      { rpcUrl: 'foo', chainId: '0x1' },
      { rpcUrl: 'bar', chainId: '0x2' },
    ]

    const oldStorage = {
      meta: {},
      data: {
        PreferencesController: {
          frequentRpcListDetail: [
            ...existingList,
          ],
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      PreferencesController: {
        frequentRpcListDetail: [
          { ...localhostNetwork },
          ...existingList,
        ],
      },
      foo: 'bar',
    })
  })

  it('should delete CachedBalancesController.cachedBalances', async function () {
    const oldStorage = {
      meta: {},
      data: {
        CachedBalancesController: {
          cachedBalances: {
            fizz: 'buzz',
          },
          bar: {
            baz: 'buzz',
          },
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      CachedBalancesController: {
        bar: {
          baz: 'buzz',
        },
      },
      foo: 'bar',
    })
  })

  it('should convert hex transaction metamaskNetworkId values to decimal', async function () {
    const oldStorage = {
      meta: {},
      data: {
        TransactionController: {
          transactions: [
            { fizz: 'buzz' },
            null,
            undefined,
            0,
            '',
            { foo: 'bar', metamaskNetworkId: '1' },
            { foo: 'bar', metamaskNetworkId: '0x1' },
            { foo: 'bar', metamaskNetworkId: 'kaplar' },
            { foo: 'bar', metamaskNetworkId: '0X2a' },
            { foo: 'bar', metamaskNetworkId: '3' },
          ],
          bar: {
            baz: 'buzz',
          },
        },
        foo: 'bar',
      },
    }

    const newStorage = await migration48.migrate(oldStorage)
    assert.deepEqual(newStorage.data, {
      ...expectedPreferencesState,
      TransactionController: {
        transactions: [
          { fizz: 'buzz' },
          null,
          undefined,
          0,
          '',
          { foo: 'bar', metamaskNetworkId: '1' },
          { foo: 'bar', metamaskNetworkId: '1' },
          { foo: 'bar', metamaskNetworkId: 'kaplar' },
          { foo: 'bar', metamaskNetworkId: '42' },
          { foo: 'bar', metamaskNetworkId: '3' },
        ],
        bar: {
          baz: 'buzz',
        },
      },
      foo: 'bar',
    })
  })
})
