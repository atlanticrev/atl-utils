import type { HttpQueryParams } from '../types.js'
import { isPlainObject, normalizeScalarValue } from './guards.js'

export type BuildUrlOptions = {
  baseUrl?: string | undefined
  params?: HttpQueryParams | undefined
  paramsSerializer?: ((params: HttpQueryParams) => string) | undefined
}

export const appendQueryParam = (params: URLSearchParams, key: string, value: unknown): void => {
  if (value === undefined) {
    return
  }

  if (value === null) {
    params.append(key, '')
    return
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      appendQueryParam(params, key, entry)
    }
    return
  }

  if (isPlainObject(value)) {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendQueryParam(params, `${key}[${nestedKey}]`, nestedValue)
    }
    return
  }

  params.append(key, normalizeScalarValue(value))
}

export const serializeQueryParams = (params: HttpQueryParams): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    appendQueryParam(searchParams, key, value)
  }

  return searchParams.toString()
}

export const buildUrl = (url: string, options: BuildUrlOptions = {}): string => {
  let resolvedUrl = options.baseUrl ? new URL(url, options.baseUrl).toString() : url

  if (!options.params || Object.keys(options.params).length === 0) {
    return resolvedUrl
  }

  const queryString = options.paramsSerializer
    ? options.paramsSerializer(options.params)
    : serializeQueryParams(options.params)

  if (!queryString) {
    return resolvedUrl
  }

  resolvedUrl += resolvedUrl.includes('?') ? '&' : '?'
  resolvedUrl += queryString

  return resolvedUrl
}
