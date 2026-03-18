export type MemoryCacheEntry<V> = {
  value: V
  createdAt: number
  updatedAt: number
  accessedAt: number
  expiresAt?: number
}

export type MemoryCacheSetOptions = {
  ttlMs?: number
}

export type MemoryCacheOptions = {
  maxSize?: number
  ttlMs?: number
  now?: () => number
}

export type MemoryCache<K, V> = {
  readonly size: number
  get(key: K): V | undefined
  getEntry(key: K): MemoryCacheEntry<V> | undefined
  set(key: K, value: V, options?: MemoryCacheSetOptions): MemoryCache<K, V>
  has(key: K): boolean
  delete(key: K): boolean
  clear(): void
  pruneExpired(): number
  keys(): K[]
  values(): V[]
  entries(): Array<[K, V]>
}

export type InFlightDedupe = {
  readonly size: number
  has(key: string): boolean
  run<T>(key: string, task: () => PromiseLike<T> | T): Promise<T>
  delete(key: string): boolean
  clear(): void
}
