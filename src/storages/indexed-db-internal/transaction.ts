import { createRequestError, createTransactionError } from './runtime.js'

export const idbRequestToPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener(
      'success',
      () => {
        resolve(request.result)
      },
      { once: true },
    )

    request.addEventListener(
      'error',
      () => {
        reject(createRequestError(request, 'IndexedDB request failed'))
      },
      { once: true },
    )
  })
}

export const idbTransactionToPromise = (transaction: IDBTransaction): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })

    const rejectWithError = (): void => {
      reject(createTransactionError(transaction, 'IndexedDB transaction failed'))
    }

    transaction.addEventListener('abort', rejectWithError, { once: true })
    transaction.addEventListener('error', rejectWithError, { once: true })
  })
}

export const withObjectStoreRequest = async <T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const transaction = db.transaction(storeName, mode)
  const store = transaction.objectStore(storeName)
  const request = createRequest(store)

  const [result] = await Promise.all([
    idbRequestToPromise(request),
    idbTransactionToPromise(transaction),
  ])

  return result
}

export const withIndexRequest = async <T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  mode: IDBTransactionMode,
  createRequest: (index: IDBIndex) => IDBRequest<T>,
): Promise<T> => {
  const transaction = db.transaction(storeName, mode)
  const index = transaction.objectStore(storeName).index(indexName)
  const request = createRequest(index)

  const [result] = await Promise.all([
    idbRequestToPromise(request),
    idbTransactionToPromise(transaction),
  ])

  return result
}

export const idbRunTransaction = async <T>(
  db: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> => {
  const transaction = db.transaction(storeNames, mode)
  const result = await run(transaction)
  await idbTransactionToPromise(transaction)
  return result
}

export const idbTx = <T>(
  db: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> => {
  return idbRunTransaction(db, storeNames, mode, run)
}
