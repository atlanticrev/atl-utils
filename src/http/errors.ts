import { AppError } from '../errors/index.js'
import type { HttpClientResponse, ResolvedHttpRequestConfig } from './types.js'

export type HttpErrorCode =
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'ABORT_ERROR'
  | 'PARSE_ERROR'
  | 'SCHEMA_VALIDATION_ERROR'
  | 'FEATURE_NOT_SUPPORTED'

export type HttpClientErrorOptions = {
  code: HttpErrorCode
  cause?: unknown
  config?: ResolvedHttpRequestConfig | undefined
  requestId?: string | undefined
}

export class HttpClientError extends AppError {
  readonly code: HttpErrorCode
  readonly cause?: unknown
  readonly config?: ResolvedHttpRequestConfig | undefined
  readonly requestId?: string | undefined

  constructor(message: string, options: HttpClientErrorOptions) {
    super(message, {
      code: options.code,
      cause: options.cause,
    })
    this.name = 'HttpClientError'
    this.code = options.code
    this.cause = options.cause
    this.config = options.config
    this.requestId = options.requestId
  }
}

export class HttpFeatureNotSupportedError extends HttpClientError {
  constructor(message: string, options: Omit<HttpClientErrorOptions, 'code'> = {}) {
    super(message, {
      ...options,
      code: 'FEATURE_NOT_SUPPORTED',
    })
    this.name = 'HttpFeatureNotSupportedError'
  }
}

export class HttpNetworkError extends HttpClientError {
  constructor(message: string, options: Omit<HttpClientErrorOptions, 'code'> = {}) {
    super(message, {
      ...options,
      code: 'NETWORK_ERROR',
    })
    this.name = 'HttpNetworkError'
  }
}

export class HttpTimeoutError extends HttpClientError {
  readonly timeoutMs: number

  constructor(
    timeoutMs: number,
    options: Omit<HttpClientErrorOptions, 'code'> = {},
    message = `Request timed out after ${timeoutMs}ms`,
  ) {
    super(message, {
      ...options,
      code: 'TIMEOUT_ERROR',
    })
    this.name = 'HttpTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export class HttpAbortError extends HttpClientError {
  constructor(message = 'Request aborted', options: Omit<HttpClientErrorOptions, 'code'> = {}) {
    super(message, {
      ...options,
      code: 'ABORT_ERROR',
    })
    this.name = 'HttpAbortError'
  }
}

export class HttpParseError extends HttpClientError {
  readonly response: Response
  readonly responseType: string

  constructor(
    message: string,
    response: Response,
    responseType: string,
    options: Omit<HttpClientErrorOptions, 'code'> = {},
  ) {
    super(message, {
      ...options,
      code: 'PARSE_ERROR',
    })
    this.name = 'HttpParseError'
    this.response = response
    this.responseType = responseType
  }
}

export class HttpSchemaValidationError extends HttpClientError {
  readonly phase: 'request' | 'response'
  readonly target: 'params' | 'headers' | 'data' | 'response'
  readonly schemaError: unknown
  readonly value: unknown
  readonly status?: number | undefined

  constructor(
    message: string,
    options: Omit<HttpClientErrorOptions, 'code'> & {
      phase: 'request' | 'response'
      target: 'params' | 'headers' | 'data' | 'response'
      schemaError: unknown
      value: unknown
      status?: number | undefined
    },
  ) {
    super(message, {
      ...options,
      code: 'SCHEMA_VALIDATION_ERROR',
    })
    this.name = 'HttpSchemaValidationError'
    this.phase = options.phase
    this.target = options.target
    this.schemaError = options.schemaError
    this.value = options.value
    this.status = options.status
  }
}

export class HttpResponseError<T = unknown> extends HttpClientError {
  readonly response: Response
  readonly status: number
  readonly statusText: string
  readonly headers: Headers
  readonly url: string
  readonly responseData: T
  readonly result?: HttpClientResponse<T> | undefined

  constructor(
    message: string,
    response: Response,
    responseData: T,
    options: Omit<HttpClientErrorOptions, 'code'> & {
      result?: HttpClientResponse<T> | undefined
    } = {},
  ) {
    super(message, {
      ...options,
      code: 'HTTP_ERROR',
    })
    this.name = 'HttpResponseError'
    this.response = response
    this.status = response.status
    this.statusText = response.statusText
    this.headers = response.headers
    this.url = options.result?.url ?? response.url
    this.responseData = responseData
    this.result = options.result
  }
}

export function isHttpClientError(value: unknown): value is HttpClientError {
  return value instanceof HttpClientError
}

export function isAbortLikeError(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }

  const maybeError = value as { name?: unknown; code?: unknown }

  return maybeError.name === 'AbortError' || maybeError.code === 'ABORT_ERR'
}
