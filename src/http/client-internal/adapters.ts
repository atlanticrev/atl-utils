import { createFetchHttpAdapter } from '../adapters/fetch.js'
import { createXhrHttpAdapter } from '../adapters/xhr.js'
import { HttpFeatureNotSupportedError } from '../errors.js'
import type {
  HttpAdapter,
  HttpAdapterName,
  HttpAdapterRequest,
  ResolvedHttpRequestConfig,
} from '../types.js'
import type { CreateHttpClientOptions, HttpClientAdapters } from './types.js'

export const createDefaultAdapters = (
  options: CreateHttpClientOptions = {},
): HttpClientAdapters => {
  return {
    fetch:
      options.adapters?.fetch ??
      (async (request) => {
        return createFetchHttpAdapter()(request)
      }),
    xhr:
      options.adapters?.xhr ??
      (async (request) => {
        return createXhrHttpAdapter()(request)
      }),
  }
}

export const toAdapterRequest = (
  config: ResolvedHttpRequestConfig,
  signal?: AbortSignal,
): HttpAdapterRequest => {
  return {
    url: config.requestUrl,
    method: config.method,
    headers: config.headers,
    body: config.body,
    signal,
    credentials: config.credentials,
    withCredentials: config.withCredentials,
    mode: config.mode,
    cache: config.cache,
    redirect: config.redirect,
    referrer: config.referrer,
    referrerPolicy: config.referrerPolicy,
    integrity: config.integrity,
    keepalive: config.keepalive,
    responseType: config.responseType,
    onUploadProgress: config.onUploadProgress,
    onDownloadProgress: config.onDownloadProgress,
  }
}

const resolveAdapterName = (config: ResolvedHttpRequestConfig): HttpAdapterName | 'custom' => {
  if (typeof config.adapter === 'function') {
    return 'custom'
  }

  if (config.adapter === 'fetch' || config.adapter === 'xhr') {
    return config.adapter
  }

  if (config.onUploadProgress) {
    return 'xhr'
  }

  return 'fetch'
}

export const resolveAdapter = (
  config: ResolvedHttpRequestConfig,
  adapters: HttpClientAdapters,
): HttpAdapter => {
  if (typeof config.adapter === 'function') {
    return config.adapter
  }

  const adapterName = resolveAdapterName(config)

  if (adapterName === 'fetch') {
    return adapters.fetch
  }

  if (adapterName === 'xhr') {
    return adapters.xhr
  }

  throw new HttpFeatureNotSupportedError(`Unsupported adapter: ${String(adapterName)}`, { config })
}
