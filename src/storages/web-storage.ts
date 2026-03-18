import { createSerializationError } from '../errors/index.js'

export type WebStorageStoreOptions = {
  prefix?: string
}

export type WebStorageStore = {
  readonly kind: string
  readonly prefix: string
  get(key: string): string | null
  getJson<T>(key: string): T | null
  set(key: string, value: string): void
  setJson(key: string, value: unknown): void
  setMany(entries: Iterable<readonly [string, string]>): void
  remove(key: string): void
  removeMany(keys: Iterable<string>): void
  has(key: string): boolean
  keys(): string[]
  values(): string[]
  entries(): Array<[string, string]>
  clear(): void
  clearAll(): void
}

type CreateWebStorageStoreOptions = WebStorageStoreOptions & {
  kind: string
}

type StorageResolver = () => Storage

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return ''
  }

  return prefix.endsWith(':') ? prefix : `${prefix}:`
}

function toStorageKey(prefix: string, key: string): string {
  return `${prefix}${key}`
}

function fromStorageKey(prefix: string, rawKey: string): string | null {
  if (!prefix) {
    return rawKey
  }

  if (!rawKey.startsWith(prefix)) {
    return null
  }

  return rawKey.slice(prefix.length)
}

function listScopedRawKeys(storage: Storage, prefix: string): string[] {
  const keys: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const rawKey = storage.key(index)
    if (rawKey === null) {
      continue
    }

    if (prefix && !rawKey.startsWith(prefix)) {
      continue
    }

    keys.push(rawKey)
  }

  return keys
}

function stringifyJson(value: unknown, key: string): string {
  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    throw createSerializationError(`Value for storage key "${key}" cannot be serialized to JSON`, {
      context: {
        key,
      },
    })
  }

  return serialized
}

export function createWebStorageStore(
  resolveStorage: StorageResolver,
  options: CreateWebStorageStoreOptions,
): WebStorageStore {
  const prefix = normalizePrefix(options.prefix)

  const get = (key: string): string | null => resolveStorage().getItem(toStorageKey(prefix, key))

  const set = (key: string, value: string): void => {
    resolveStorage().setItem(toStorageKey(prefix, key), value)
  }

  const entries = (): Array<[string, string]> => {
    const storage = resolveStorage()

    const result: Array<[string, string]> = []

    for (const rawKey of listScopedRawKeys(storage, prefix)) {
      const key = fromStorageKey(prefix, rawKey)

      if (key === null) {
        continue
      }

      const value = storage.getItem(rawKey)

      if (value === null) {
        continue
      }

      result.push([key, value])
    }

    return result
  }

  return {
    kind: options.kind,
    prefix,
    get,
    getJson<T>(key: string) {
      const rawValue = get(key)
      if (rawValue === null) {
        return null
      }

      return JSON.parse(rawValue) as T
    },
    set,
    setJson(key: string, value: unknown) {
      set(key, stringifyJson(value, key))
    },
    setMany(entries: Iterable<readonly [string, string]>) {
      const storage = resolveStorage()
      for (const [key, value] of entries) {
        storage.setItem(toStorageKey(prefix, key), value)
      }
    },
    remove(key: string) {
      resolveStorage().removeItem(toStorageKey(prefix, key))
    },
    removeMany(keys: Iterable<string>) {
      const storage = resolveStorage()
      for (const key of keys) {
        storage.removeItem(toStorageKey(prefix, key))
      }
    },
    has(key: string) {
      return get(key) !== null
    },
    keys() {
      const storage = resolveStorage()
      const result: string[] = []

      for (const rawKey of listScopedRawKeys(storage, prefix)) {
        const key = fromStorageKey(prefix, rawKey)
        if (key !== null) {
          result.push(key)
        }
      }

      return result
    },
    values() {
      return entries().map(([, value]) => value)
    },
    entries,
    clear() {
      const storage = resolveStorage()

      if (!prefix) {
        storage.clear()
        return
      }

      for (const rawKey of listScopedRawKeys(storage, prefix)) {
        storage.removeItem(rawKey)
      }
    },
    clearAll() {
      resolveStorage().clear()
    },
  }
}
