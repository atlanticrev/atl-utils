import { createError, createRuntimeUnavailableError } from '../errors/index.js'
import {
  type WebStorageStore,
  type WebStorageStoreOptions,
  createWebStorageStore,
} from './web-storage.js'

function getBrowserStorage(kind: 'localStorage' | 'sessionStorage'): Storage {
  const globalScope = globalThis as typeof globalThis & {
    localStorage?: Storage
    sessionStorage?: Storage
  }

  if (typeof window === 'undefined' || !globalScope[kind]) {
    throw createRuntimeUnavailableError(kind, {
      code: 'STORAGE_UNAVAILABLE',
    })
  }

  try {
    return globalScope[kind]
  } catch (error) {
    throw createError(`Failed to access ${kind}. The browser may block storage access.`, {
      code: 'STORAGE_ACCESS_ERROR',
      cause: error,
    })
  }
}

export type { WebStorageStore, WebStorageStoreOptions }

export function getSessionStorage(): Storage {
  return getBrowserStorage('sessionStorage')
}

export function createSessionStorageStore(options: WebStorageStoreOptions = {}): WebStorageStore {
  return createWebStorageStore(getSessionStorage, {
    kind: 'sessionStorage',
    ...options,
  })
}
