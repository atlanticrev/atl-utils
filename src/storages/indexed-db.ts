export type {
  IndexedDbIndexDefinition,
  IndexedDbQuery,
  IndexedDbSchema,
  IndexedDbStoreClient,
  IndexedDbStoreDefinition,
  OpenIndexedDbOptions,
} from './indexed-db-internal/types.js'

export {
  idbRequestToPromise,
  idbRunTransaction,
  idbTransactionToPromise,
  idbTx,
} from './indexed-db-internal/transaction.js'

export {
  createIndexedDbStore,
  idbAdd,
  idbClear,
  idbClearStore,
  idbCount,
  idbCountByIndex,
  idbDelete,
  idbDeleteRecord,
  idbGet,
  idbGetAll,
  idbGetAllByIndex,
  idbGetAllKeys,
  idbGetByIndex,
  idbHas,
  idbPut,
} from './indexed-db-internal/operations.js'

export {
  closeIndexedDb,
  deleteIndexedDb,
  openIndexedDb,
} from './indexed-db-internal/database.js'
