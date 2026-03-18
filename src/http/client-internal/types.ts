import type { HttpAdapter, ResolvedHttpRequestConfig } from '../types.js'

export type AbortComposition = {
  signal?: AbortSignal | undefined
  cleanup: () => void
  didTimeout: () => boolean
  wasAborted: () => boolean
}

export type HttpClientAdapters = {
  fetch: HttpAdapter
  xhr: HttpAdapter
}

export type CreateHttpClientOptions = {
  adapters?: Partial<HttpClientAdapters>
}

export type SchemaValidationOptions = {
  requestId: string
  config?: ResolvedHttpRequestConfig | undefined
  phase: 'request' | 'response'
  target: 'params' | 'headers' | 'data' | 'response'
  status?: number | undefined
}
