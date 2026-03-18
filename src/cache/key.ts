import { createTypeError } from '../errors/index.js'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function serializeKeyInternal(value: unknown, seen: WeakSet<object>): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  const primitiveType = typeof value
  switch (primitiveType) {
    case 'string':
      return `str:${JSON.stringify(value)}`
    case 'number':
      return Number.isNaN(value) ? 'num:NaN' : `num:${String(value)}`
    case 'boolean':
      return `bool:${String(value)}`
    case 'bigint':
      return `bigint:${value.toString()}`
    case 'symbol':
      throw createTypeError('Symbols are not supported as cache keys', {
        code: 'UNSUPPORTED_CACHE_KEY',
      })
    case 'function':
      throw createTypeError('Functions are not supported as cache keys', {
        code: 'UNSUPPORTED_CACHE_KEY',
      })
  }

  if (value instanceof Date) {
    return `date:${value.toISOString()}`
  }

  if (typeof URL !== 'undefined' && value instanceof URL) {
    return `url:${value.toString()}`
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw createTypeError('Circular structures are not supported as cache keys', {
        code: 'CIRCULAR_CACHE_KEY',
      })
    }

    seen.add(value)
    const items = value.map((entry) => serializeKeyInternal(entry, seen))
    return `arr:[${items.join(',')}]`
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      throw createTypeError('Circular structures are not supported as cache keys', {
        code: 'CIRCULAR_CACHE_KEY',
      })
    }

    seen.add(value)
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    const serializedEntries = entries.map(
      ([key, entryValue]) => `${JSON.stringify(key)}:${serializeKeyInternal(entryValue, seen)}`,
    )
    return `obj:{${serializedEntries.join(',')}}`
  }

  throw createTypeError('Unsupported cache key value', {
    code: 'UNSUPPORTED_CACHE_KEY',
    context: {
      tag: Object.prototype.toString.call(value),
    },
  })
}

export function stableSerializeCacheKey(value: unknown): string {
  return serializeKeyInternal(value, new WeakSet<object>())
}

export function joinCacheKey(parts: readonly unknown[]): string {
  return parts.map((part) => stableSerializeCacheKey(part)).join('|')
}
