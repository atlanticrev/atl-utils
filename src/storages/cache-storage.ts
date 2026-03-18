import { createRuntimeUnavailableError, createSerializationError } from '../errors/index.js'

export type BrowserCacheKey = string | URL | Request

function getCacheStorage(): CacheStorage {
  if (typeof caches === 'undefined') {
    throw createRuntimeUnavailableError('Cache Storage API', {
      code: 'CACHE_STORAGE_UNAVAILABLE',
    })
  }

  return caches
}

function normalizeCacheKey(key: BrowserCacheKey): RequestInfo {
  if (key instanceof URL) {
    return key.toString()
  }

  return key
}

function stringifyJson(value: unknown): string {
  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    throw createSerializationError('Value cannot be serialized to JSON')
  }

  return serialized
}

export async function openBrowserCache(name: string): Promise<Cache> {
  return getCacheStorage().open(name)
}

export async function listBrowserCaches(): Promise<string[]> {
  return getCacheStorage().keys()
}

export async function hasBrowserCache(name: string): Promise<boolean> {
  const cacheNames = await listBrowserCaches()
  return cacheNames.includes(name)
}

export async function deleteBrowserCache(name: string): Promise<boolean> {
  return getCacheStorage().delete(name)
}

export type BrowserCacheBucket = {
  readonly name: string
  get(key: BrowserCacheKey, options?: CacheQueryOptions): Promise<Response | null>
  getText(key: BrowserCacheKey, options?: CacheQueryOptions): Promise<string | null>
  getJson<T>(key: BrowserCacheKey, options?: CacheQueryOptions): Promise<T | null>
  put(key: BrowserCacheKey, response: Response): Promise<void>
  putText(key: BrowserCacheKey, body: BodyInit | null, init?: ResponseInit): Promise<void>
  putJson(key: BrowserCacheKey, value: unknown, init?: ResponseInit): Promise<void>
  has(key: BrowserCacheKey, options?: CacheQueryOptions): Promise<boolean>
  delete(key: BrowserCacheKey, options?: CacheQueryOptions): Promise<boolean>
  keys(request?: BrowserCacheKey, options?: CacheQueryOptions): Promise<Request[]>
  clear(): Promise<number>
  destroy(): Promise<boolean>
}

export function createBrowserCacheBucket(name: string): BrowserCacheBucket {
  const get = async (
    key: BrowserCacheKey,
    options?: CacheQueryOptions,
  ): Promise<Response | null> => {
    const cache = await openBrowserCache(name)
    return (await cache.match(normalizeCacheKey(key), options)) ?? null
  }

  const put = async (key: BrowserCacheKey, response: Response): Promise<void> => {
    const cache = await openBrowserCache(name)
    await cache.put(normalizeCacheKey(key), response.clone())
  }

  return {
    name,
    get,
    async getText(key, options) {
      const response = await get(key, options)
      if (!response) {
        return null
      }

      return response.clone().text()
    },
    async getJson<T>(key: BrowserCacheKey, options?: CacheQueryOptions) {
      const response = await get(key, options)
      if (!response) {
        return null
      }

      return (await response.clone().json()) as T
    },
    put,
    async putText(key: BrowserCacheKey, body: BodyInit | null, init?: ResponseInit) {
      await put(key, new Response(body, init))
    },
    async putJson(key: BrowserCacheKey, value: unknown, init: ResponseInit = {}) {
      const headers = new Headers(init.headers)
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json')
      }

      await put(
        key,
        new Response(stringifyJson(value), {
          ...init,
          headers,
        }),
      )
    },
    async has(key: BrowserCacheKey, options?: CacheQueryOptions) {
      return (await get(key, options)) !== null
    },
    async delete(key: BrowserCacheKey, options?: CacheQueryOptions) {
      const cache = await openBrowserCache(name)
      return cache.delete(normalizeCacheKey(key), options)
    },
    async keys(request?: BrowserCacheKey, options?: CacheQueryOptions) {
      const cache = await openBrowserCache(name)

      if (request === undefined) {
        return Array.from(await cache.keys())
      }

      return Array.from(await cache.keys(normalizeCacheKey(request), options))
    },
    async clear() {
      const cache = await openBrowserCache(name)
      const requests = await cache.keys()
      const results = await Promise.all(requests.map((request) => cache.delete(request)))

      let deletedCount = 0
      for (const deleted of results) {
        if (deleted) {
          deletedCount += 1
        }
      }

      return deletedCount
    },
    async destroy() {
      return deleteBrowserCache(name)
    },
  }
}
