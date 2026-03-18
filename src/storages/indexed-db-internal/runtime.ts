import { createError, createRuntimeUnavailableError } from '../../errors/index.js'

export const getIndexedDbFactory = (): IDBFactory => {
  if (typeof indexedDB === 'undefined') {
    throw createRuntimeUnavailableError('IndexedDB', {
      code: 'INDEXED_DB_UNAVAILABLE',
    })
  }

  return indexedDB
}

export const createRequestError = <T>(request: IDBRequest<T>, fallbackMessage: string): Error => {
  return request.error ?? createError(fallbackMessage, { code: 'INDEXED_DB_REQUEST_ERROR' })
}

export const createTransactionError = (
  transaction: IDBTransaction,
  fallbackMessage: string,
): Error => {
  return transaction.error ?? createError(fallbackMessage, { code: 'INDEXED_DB_TRANSACTION_ERROR' })
}
