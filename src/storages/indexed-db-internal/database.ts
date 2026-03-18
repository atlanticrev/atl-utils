import { createInvalidStateError } from '../../errors/index.js'
import { createRequestError, getIndexedDbFactory } from './runtime.js'
import { idbRequestToPromise } from './transaction.js'
import type { IndexedDbSchema, OpenIndexedDbOptions } from './types.js'

const applySchemaUpgrade = (
  db: IDBDatabase,
  transaction: IDBTransaction,
  schema: IndexedDbSchema,
): void => {
  for (const [storeName, definition] of Object.entries(schema)) {
    let store: IDBObjectStore

    if (db.objectStoreNames.contains(storeName)) {
      store = transaction.objectStore(storeName)
    } else {
      const createOptions: IDBObjectStoreParameters = {}

      if (definition.keyPath !== undefined) {
        createOptions.keyPath = definition.keyPath
      }

      if (definition.autoIncrement !== undefined) {
        createOptions.autoIncrement = definition.autoIncrement
      }

      store = db.createObjectStore(storeName, createOptions)
    }

    const existingIndexes = new Set(Array.from(store.indexNames))
    for (const index of definition.indexes ?? []) {
      if (!existingIndexes.has(index.name)) {
        store.createIndex(index.name, index.keyPath, index.options)
      }
    }
  }
}

export const closeIndexedDb = (db: IDBDatabase): void => {
  db.close()
}

export const openIndexedDb = async (options: OpenIndexedDbOptions): Promise<IDBDatabase> => {
  const request = getIndexedDbFactory().open(options.name, options.version)

  request.addEventListener('upgradeneeded', (event) => {
    const db = request.result
    const transaction = request.transaction

    if (!transaction) {
      throw createInvalidStateError('IndexedDB upgrade transaction is unavailable', {
        code: 'INDEXED_DB_UPGRADE_TRANSACTION_UNAVAILABLE',
      })
    }

    if (options.stores) {
      applySchemaUpgrade(db, transaction, options.stores)
    }

    options.upgrade?.({
      db,
      transaction,
      event: event as IDBVersionChangeEvent,
    })
  })

  if (options.blocked) {
    request.addEventListener('blocked', options.blocked)
  }

  const db = await idbRequestToPromise(request)

  if (options.onVersionChange) {
    db.addEventListener('versionchange', (event) => {
      options.onVersionChange?.(event, db)
    })
  }

  return db
}

export const deleteIndexedDb = (name: string): Promise<void> => {
  const request = getIndexedDbFactory().deleteDatabase(name)

  return new Promise<void>((resolve, reject) => {
    request.addEventListener(
      'success',
      () => {
        resolve()
      },
      { once: true },
    )

    request.addEventListener(
      'error',
      () => {
        reject(createRequestError(request, `Failed to delete IndexedDB database "${name}"`))
      },
      { once: true },
    )
  })
}
