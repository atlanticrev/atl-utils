import { withIndexRequest, withObjectStoreRequest } from './transaction.js'
import type { IndexedDbQuery, IndexedDbStoreClient } from './types.js'

export const idbGet = <T = unknown>(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<T | undefined> => {
  return withObjectStoreRequest<T | undefined>(db, storeName, 'readonly', (store) => store.get(key))
}

export const idbGetAll = <T = unknown>(
  db: IDBDatabase,
  storeName: string,
  query?: IndexedDbQuery,
  count?: number,
): Promise<T[]> => {
  return withObjectStoreRequest<T[]>(db, storeName, 'readonly', (store) =>
    store.getAll(query, count),
  )
}

export const idbGetAllKeys = async <Key extends IDBValidKey = IDBValidKey>(
  db: IDBDatabase,
  storeName: string,
  query?: IndexedDbQuery,
  count?: number,
): Promise<Key[]> => {
  const keys = await withObjectStoreRequest<IDBValidKey[]>(db, storeName, 'readonly', (store) => {
    return store.getAllKeys(query, count)
  })

  return keys as Key[]
}

export const idbCount = (
  db: IDBDatabase,
  storeName: string,
  query?: IndexedDbQuery,
): Promise<number> => {
  return withObjectStoreRequest<number>(db, storeName, 'readonly', (store) => {
    return query === null ? store.count() : store.count(query)
  })
}

export const idbHas = async (
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): Promise<boolean> => {
  return (await idbCount(db, storeName, key)) > 0
}

export const idbAdd = <T>(
  db: IDBDatabase,
  storeName: string,
  value: T,
  key?: IDBValidKey,
): Promise<IDBValidKey> => {
  return withObjectStoreRequest<IDBValidKey>(db, storeName, 'readwrite', (store) => {
    return store.add(value, key)
  })
}

export const idbPut = <T>(
  db: IDBDatabase,
  storeName: string,
  value: T,
  key?: IDBValidKey,
): Promise<IDBValidKey> => {
  return withObjectStoreRequest<IDBValidKey>(db, storeName, 'readwrite', (store) => {
    return store.put(value, key)
  })
}

export const idbDeleteRecord = (
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey | IDBKeyRange,
): Promise<void> => {
  return withObjectStoreRequest<undefined>(db, storeName, 'readwrite', (store) =>
    store.delete(key),
  ).then(() => undefined)
}

export const idbDelete = (
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey | IDBKeyRange,
): Promise<void> => {
  return idbDeleteRecord(db, storeName, key)
}

export const idbClearStore = (db: IDBDatabase, storeName: string): Promise<void> => {
  return withObjectStoreRequest<undefined>(db, storeName, 'readwrite', (store) =>
    store.clear(),
  ).then(() => undefined)
}

export const idbClear = (db: IDBDatabase, storeName: string): Promise<void> => {
  return idbClearStore(db, storeName)
}

export const idbGetByIndex = <T = unknown>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange,
): Promise<T | undefined> => {
  return withIndexRequest<T | undefined>(db, storeName, indexName, 'readonly', (index) =>
    index.get(query),
  )
}

export const idbGetAllByIndex = <T = unknown>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  query?: IndexedDbQuery,
  count?: number,
): Promise<T[]> => {
  return withIndexRequest<T[]>(db, storeName, indexName, 'readonly', (index) =>
    index.getAll(query, count),
  )
}

export const idbCountByIndex = (
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  query?: IndexedDbQuery,
): Promise<number> => {
  return withIndexRequest<number>(db, storeName, indexName, 'readonly', (index) => {
    return query === null ? index.count() : index.count(query)
  })
}

export const createIndexedDbStore = <T = unknown>(
  db: IDBDatabase,
  storeName: string,
): IndexedDbStoreClient<T> => {
  return {
    db,
    storeName,
    get(key) {
      return idbGet<T>(db, storeName, key)
    },
    getAll(query, count) {
      return idbGetAll<T>(db, storeName, query, count)
    },
    getAllKeys(query, count) {
      return idbGetAllKeys(db, storeName, query, count)
    },
    count(query) {
      return idbCount(db, storeName, query)
    },
    has(key) {
      return idbHas(db, storeName, key)
    },
    add(value, key) {
      return idbAdd(db, storeName, value, key)
    },
    put(value, key) {
      return idbPut(db, storeName, value, key)
    },
    delete(key) {
      return idbDeleteRecord(db, storeName, key)
    },
    clear() {
      return idbClearStore(db, storeName)
    },
    getByIndex(indexName, query) {
      return idbGetByIndex<T>(db, storeName, indexName, query)
    },
    getAllByIndex(indexName, query, count) {
      return idbGetAllByIndex<T>(db, storeName, indexName, query, count)
    },
    countByIndex(indexName, query) {
      return idbCountByIndex(db, storeName, indexName, query)
    },
  }
}
