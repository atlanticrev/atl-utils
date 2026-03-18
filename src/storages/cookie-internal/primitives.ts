import { createRuntimeUnavailableError, createSerializationError } from '../../errors/index.js'
import type { CookieAttributes } from './types.js'

export const normalizePrefix = (prefix?: string): string => {
  if (!prefix) {
    return ''
  }

  return prefix.endsWith(':') ? prefix : `${prefix}:`
}

export const stringifyJson = (value: unknown, key: string): string => {
  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    throw createSerializationError(`Value for cookie "${key}" cannot be serialized to JSON`, {
      context: {
        key,
      },
    })
  }

  return serialized
}

export const getCookieDocument = (): Document => {
  if (typeof document === 'undefined') {
    throw createRuntimeUnavailableError('document.cookie', {
      code: 'COOKIE_UNAVAILABLE',
    })
  }

  return document
}

export const encodeCookieComponent = (value: string): string => {
  return encodeURIComponent(value)
}

export const decodeCookieComponent = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const formatCookieExpires = (value: Exclude<CookieAttributes['expires'], undefined>): string => {
  if (value instanceof Date) {
    return value.toUTCString()
  }

  if (typeof value === 'number') {
    return new Date(value).toUTCString()
  }

  return value
}

export const serializeCookie = (
  key: string,
  value: string,
  attributes: CookieAttributes = {},
  encode: (value: string) => string = encodeCookieComponent,
): string => {
  const parts = [`${encode(key)}=${encode(value)}`]

  if (attributes.path) {
    parts.push(`Path=${attributes.path}`)
  }

  if (attributes.domain) {
    parts.push(`Domain=${attributes.domain}`)
  }

  if (attributes.expires !== undefined) {
    parts.push(`Expires=${formatCookieExpires(attributes.expires)}`)
  }

  if (attributes.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.trunc(attributes.maxAge)}`)
  }

  if (attributes.sameSite) {
    parts.push(`SameSite=${attributes.sameSite}`)
  }

  if (attributes.secure) {
    parts.push('Secure')
  }

  if (attributes.partitioned) {
    parts.push('Partitioned')
  }

  return parts.join('; ')
}

export const parseCookieString = (
  cookieString: string,
  decode: (value: string) => string = decodeCookieComponent,
): Record<string, string> => {
  const result: Record<string, string> = {}

  for (const chunk of cookieString.split(';')) {
    const trimmed = chunk.trim()
    if (!trimmed) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    const rawKey = separatorIndex === -1 ? trimmed : trimmed.slice(0, separatorIndex)
    const rawValue = separatorIndex === -1 ? '' : trimmed.slice(separatorIndex + 1)

    result[decode(rawKey)] = decode(rawValue)
  }

  return result
}
