import { HttpAbortError, HttpNetworkError, HttpTimeoutError, isHttpClientError } from '../errors.js'
import { isAbortLikeError } from '../errors.js'
import type { ResolvedHttpRequestConfig } from '../types.js'

type NormalizeUnknownErrorOptions = {
  config?: ResolvedHttpRequestConfig | undefined
  requestId: string
  timeoutMs?: number | undefined
  didTimeout?: boolean | undefined
}

export const normalizeUnknownError = (
  error: unknown,
  options: NormalizeUnknownErrorOptions,
): Error => {
  if (isHttpClientError(error)) {
    return error
  }

  if (options.didTimeout && options.timeoutMs !== undefined) {
    return new HttpTimeoutError(options.timeoutMs, {
      cause: error,
      config: options.config,
      requestId: options.requestId,
    })
  }

  if (isAbortLikeError(error)) {
    return new HttpAbortError('Request aborted', {
      cause: error,
      config: options.config,
      requestId: options.requestId,
    })
  }

  if (error instanceof Error) {
    return new HttpNetworkError(error.message, {
      cause: error,
      config: options.config,
      requestId: options.requestId,
    })
  }

  return new HttpNetworkError('Network request failed', {
    cause: error,
    config: options.config,
    requestId: options.requestId,
  })
}

export const ensureAbortError = (
  error: unknown,
  config: ResolvedHttpRequestConfig | undefined,
  requestId: string,
): HttpAbortError => {
  if (error instanceof HttpAbortError) {
    return error
  }

  return new HttpAbortError('Request aborted', {
    cause: error,
    config,
    requestId,
  })
}
