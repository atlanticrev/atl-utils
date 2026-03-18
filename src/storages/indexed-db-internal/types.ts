export type IndexedDbIndexDefinition = {
  name: string
  keyPath: string | string[]
  options?: IDBIndexParameters
}

export type IndexedDbStoreDefinition = {
  keyPath?: string | string[] | null
  autoIncrement?: boolean
  indexes?: IndexedDbIndexDefinition[]
}

export type IndexedDbSchema = Record<string, IndexedDbStoreDefinition>

export type OpenIndexedDbOptions = {
  name: string
  version: number
  stores?: IndexedDbSchema
  upgrade?: (context: {
    db: IDBDatabase
    transaction: IDBTransaction
    event: IDBVersionChangeEvent
  }) => void
  blocked?: (event: Event) => void
  onVersionChange?: (event: Event, db: IDBDatabase) => void
}

export type IndexedDbQuery = IDBValidKey | IDBKeyRange | null

export type IndexedDbStoreClient<T = unknown> = {
  readonly db: IDBDatabase
  readonly storeName: string
  get(key: IDBValidKey): Promise<T | undefined>
  getAll(query?: IndexedDbQuery, count?: number): Promise<T[]>
  getAllKeys<Key extends IDBValidKey = IDBValidKey>(
    query?: IndexedDbQuery,
    count?: number,
  ): Promise<Key[]>
  count(query?: IndexedDbQuery): Promise<number>
  has(key: IDBValidKey): Promise<boolean>
  add(value: T, key?: IDBValidKey): Promise<IDBValidKey>
  put(value: T, key?: IDBValidKey): Promise<IDBValidKey>
  delete(key: IDBValidKey | IDBKeyRange): Promise<void>
  clear(): Promise<void>
  getByIndex(indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T | undefined>
  getAllByIndex(indexName: string, query?: IndexedDbQuery, count?: number): Promise<T[]>
  countByIndex(indexName: string, query?: IndexedDbQuery): Promise<number>
}
