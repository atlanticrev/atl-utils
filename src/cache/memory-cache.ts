import { createInvalidStateError } from '../errors/index.js'
import type {
  MemoryCache,
  MemoryCacheEntry,
  MemoryCacheOptions,
  MemoryCacheSetOptions,
} from './types.js'

type InternalCacheEntry<V> = MemoryCacheEntry<V>

function normalizePositiveInteger(value: number | undefined, field: 'maxSize'): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value) || value < 1) {
    throw createInvalidStateError(`\`${field}\` must be a finite integer >= 1`, {
      code: 'INVALID_CACHE_OPTION',
      context: {
        field,
        value,
      },
    })
  }

  return Math.trunc(value)
}

function normalizeNonNegative(value: number | undefined, field: 'ttlMs'): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value) || value < 0) {
    throw createInvalidStateError(`\`${field}\` must be a finite number >= 0`, {
      code: 'INVALID_CACHE_OPTION',
      context: {
        field,
        value,
      },
    })
  }

  return Math.trunc(value)
}

function cloneEntry<V>(entry: InternalCacheEntry<V>): MemoryCacheEntry<V> {
  return { ...entry }
}

export function createMemoryCache<K, V>(options: MemoryCacheOptions = {}): MemoryCache<K, V> {
  const maxSize = normalizePositiveInteger(options.maxSize, 'maxSize')
  const defaultTtlMs = normalizeNonNegative(options.ttlMs, 'ttlMs')
  const now = options.now ?? (() => Date.now())
  const store = new Map<K, InternalCacheEntry<V>>()

  const isExpired = (entry: InternalCacheEntry<V>, at: number): boolean =>
    entry.expiresAt !== undefined && entry.expiresAt <= at

  const deleteIfExpired = (key: K, entry: InternalCacheEntry<V>, at: number): boolean => {
    if (!isExpired(entry, at)) {
      return false
    }

    store.delete(key)
    return true
  }

  const touch = (key: K, entry: InternalCacheEntry<V>, at: number) => {
    entry.accessedAt = at

    // Reinsert to preserve LRU order (newest at the end).
    store.delete(key)
    store.set(key, entry)
  }

  const enforceMaxSize = () => {
    if (maxSize === undefined) {
      return
    }

    while (store.size > maxSize) {
      const oldestKey = store.keys().next().value as K | undefined
      if (oldestKey === undefined) {
        return
      }

      store.delete(oldestKey)
    }
  }

  const cache: MemoryCache<K, V> = {
    get size() {
      return store.size
    },
    get(key) {
      const entry = store.get(key)
      if (!entry) {
        return undefined
      }

      const currentTime = now()
      if (deleteIfExpired(key, entry, currentTime)) {
        return undefined
      }

      touch(key, entry, currentTime)
      return entry.value
    },
    getEntry(key) {
      const entry = store.get(key)
      if (!entry) {
        return undefined
      }

      const currentTime = now()
      if (deleteIfExpired(key, entry, currentTime)) {
        return undefined
      }

      touch(key, entry, currentTime)
      return cloneEntry(entry)
    },
    set(key, value, setOptions: MemoryCacheSetOptions = {}) {
      const currentTime = now()
      const ttlMs = normalizeNonNegative(setOptions.ttlMs ?? defaultTtlMs, 'ttlMs')
      const existing = store.get(key)

      const nextEntry: InternalCacheEntry<V> = {
        value,
        createdAt: existing?.createdAt ?? currentTime,
        updatedAt: currentTime,
        accessedAt: currentTime,
      }

      if (ttlMs !== undefined) {
        nextEntry.expiresAt = currentTime + ttlMs
      }

      if (store.has(key)) {
        store.delete(key)
      }

      store.set(key, nextEntry)
      enforceMaxSize()
      return this
    },
    has(key) {
      const entry = store.get(key)
      if (!entry) {
        return false
      }

      return !deleteIfExpired(key, entry, now())
    },
    delete(key) {
      return store.delete(key)
    },
    clear() {
      store.clear()
    },
    pruneExpired() {
      const currentTime = now()
      let removed = 0

      for (const [key, entry] of store.entries()) {
        if (deleteIfExpired(key, entry, currentTime)) {
          removed += 1
        }
      }

      return removed
    },
    keys() {
      cache.pruneExpired()
      return Array.from(store.keys())
    },
    values() {
      cache.pruneExpired()
      return Array.from(store.values(), (entry) => entry.value)
    },
    entries() {
      cache.pruneExpired()
      return Array.from(store.entries(), ([key, entry]) => [key, entry.value] as [K, V])
    },
  }

  return cache
}
