import {
  decodeCookieComponent,
  encodeCookieComponent,
  getCookieDocument,
  normalizePrefix,
  parseCookieString,
  serializeCookie,
  stringifyJson,
} from './primitives.js'
import type { CookieAttributes, CookieStorage, CookieStorageOptions } from './types.js'

export const createCookieStorage = (options: CookieStorageOptions = {}): CookieStorage => {
  const prefix = normalizePrefix(options.prefix)
  const encode = options.encode ?? encodeCookieComponent
  const decode = options.decode ?? decodeCookieComponent
  const defaultAttributes = options.defaultAttributes ?? {}

  const toCookieKey = (key: string): string => `${prefix}${key}`

  const listEntries = (): Array<[string, string]> => {
    const parsed = parseCookieString(getCookieDocument().cookie, decode)
    const entries: Array<[string, string]> = []

    for (const [rawKey, value] of Object.entries(parsed)) {
      if (prefix && !rawKey.startsWith(prefix)) {
        continue
      }

      entries.push([prefix ? rawKey.slice(prefix.length) : rawKey, value])
    }

    return entries
  }

  const get = (key: string): string | null => {
    const parsed = parseCookieString(getCookieDocument().cookie, decode)
    return parsed[toCookieKey(key)] ?? null
  }

  const set = (key: string, value: string, attributes: CookieAttributes = {}): void => {
    const mergedAttributes: CookieAttributes = {
      ...defaultAttributes,
      ...attributes,
    }

    getCookieDocument().cookie = serializeCookie(toCookieKey(key), value, mergedAttributes, encode)
  }

  return {
    prefix,
    raw() {
      return getCookieDocument().cookie
    },
    get,
    getJson<T>(key: string) {
      const rawValue = get(key)
      if (rawValue === null) {
        return null
      }

      return JSON.parse(rawValue) as T
    },
    set,
    setJson(key: string, value: unknown, attributes: CookieAttributes = {}) {
      set(key, stringifyJson(value, key), attributes)
    },
    remove(key: string, attributes: CookieAttributes = {}) {
      set(key, '', {
        ...attributes,
        expires: new Date(0),
        maxAge: 0,
      })
    },
    has(key: string) {
      return get(key) !== null
    },
    keys() {
      return listEntries().map(([key]) => key)
    },
    entries() {
      return listEntries()
    },
    clear(attributes = {}) {
      for (const [key] of listEntries()) {
        set(key, '', {
          ...attributes,
          expires: new Date(0),
          maxAge: 0,
        })
      }
    },
  }
}
