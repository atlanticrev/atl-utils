import {
  HttpAbortError,
  HttpNetworkError,
  HttpResponseError,
  HttpTimeoutError,
  isAbortLikeError,
} from './errors.js'
import type { HttpRetryDecisionContext, HttpRetryInput, HttpRetryOptions } from './types.js'

export const DEFAULT_HTTP_RETRY_OPTIONS: HttpRetryOptions = {
  retries: 0,
  baseDelayMs: 250,
  maxDelayMs: 5_000,
  backoffFactor: 2,
  jitter: 'full',
  retryMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
  retryOnStatuses: [408, 425, 429, 500, 502, 503, 504],
  respectRetryAfter: true,
}

function normalizeMethodNames(methods: string[] | undefined, fallback: string[]): string[] {
  if (!methods || methods.length === 0) {
    return [...fallback]
  }

  return methods.map((method) => method.toUpperCase())
}

export function normalizeRetryOptions(input: HttpRetryInput): HttpRetryOptions {
  if (input === false) {
    return {
      ...DEFAULT_HTTP_RETRY_OPTIONS,
      retries: 0,
    }
  }

  if (typeof input === 'number') {
    return {
      ...DEFAULT_HTTP_RETRY_OPTIONS,
      retries: Math.max(0, Math.trunc(input)),
    }
  }

  const merged: HttpRetryOptions = {
    ...DEFAULT_HTTP_RETRY_OPTIONS,
    ...(input ?? {}),
  }

  merged.retries = Math.max(0, Math.trunc(merged.retries))
  merged.baseDelayMs = Math.max(0, Math.trunc(merged.baseDelayMs))
  merged.maxDelayMs = Math.max(merged.baseDelayMs, Math.trunc(merged.maxDelayMs))
  merged.backoffFactor = Math.max(1, merged.backoffFactor)
  merged.retryMethods = normalizeMethodNames(
    merged.retryMethods,
    DEFAULT_HTTP_RETRY_OPTIONS.retryMethods,
  )
  merged.retryOnStatuses = [
    ...(merged.retryOnStatuses ?? DEFAULT_HTTP_RETRY_OPTIONS.retryOnStatuses),
  ]

  return merged
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (!header) {
    return null
  }

  const seconds = Number(header)
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000)
  }

  const dateMs = Date.parse(header)
  if (Number.isNaN(dateMs)) {
    return null
  }

  return Math.max(0, dateMs - Date.now())
}

export function calculateRetryDelayMs(
  options: HttpRetryOptions,
  attempt: number,
  response?: Response,
): number {
  if (response && options.respectRetryAfter) {
    const retryAfterMs = parseRetryAfterMs(response)
    if (retryAfterMs !== null) {
      return Math.min(options.maxDelayMs, retryAfterMs)
    }
  }

  const exponentialDelay = options.baseDelayMs * options.backoffFactor ** Math.max(0, attempt - 1)
  const clamped = Math.min(options.maxDelayMs, exponentialDelay)

  switch (options.jitter) {
    case 'none':
      return clamped
    case 'equal':
      return clamped / 2 + Math.random() * (clamped / 2)
    default:
      return Math.random() * clamped
  }
}

function isRetriableMethod(method: string, options: HttpRetryOptions): boolean {
  return options.retryMethods.includes(method.toUpperCase())
}

function isRetriableError(error: unknown): boolean {
  if (error instanceof HttpAbortError) {
    return false
  }

  if (error instanceof HttpTimeoutError || error instanceof HttpNetworkError) {
    return true
  }

  if (isAbortLikeError(error)) {
    return false
  }

  if (error instanceof TypeError) {
    return true
  }

  return false
}

export async function shouldRetryRequest(
  context: HttpRetryDecisionContext,
  options: HttpRetryOptions,
): Promise<boolean> {
  if (context.attempt > options.retries) {
    return false
  }

  if (!isRetriableMethod(context.config.method, options)) {
    return false
  }

  let defaultDecision = false

  if (context.response) {
    defaultDecision = options.retryOnStatuses.includes(context.response.status)
  } else if (context.error) {
    if (context.error instanceof HttpResponseError) {
      defaultDecision = options.retryOnStatuses.includes(context.error.status)
    } else {
      defaultDecision = isRetriableError(context.error)
    }
  }

  if (options.shouldRetry) {
    const customDecision = await options.shouldRetry(context)
    return Boolean(customDecision)
  }

  return defaultDecision
}
