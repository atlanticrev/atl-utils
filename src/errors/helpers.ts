import { AppError } from './app-error.js'
import type { ErrorLike, ErrorMetadata } from './types.js'

export function isErrorLike(value: unknown): value is ErrorLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as ErrorLike

  return typeof candidate.message === 'string' || typeof candidate.name === 'string'
}

export function toError(
  value: unknown,
  options: {
    fallbackMessage?: string
    code?: string
    context?: Record<string, unknown>
  } = {},
): Error {
  if (value instanceof Error) {
    return value
  }

  if (typeof value === 'string') {
    const metadata: ErrorMetadata = {}
    if (options.code !== undefined) {
      metadata.code = options.code
    }
    if (options.context !== undefined) {
      metadata.context = options.context
    }

    return new AppError(value, metadata)
  }

  if (isErrorLike(value)) {
    const metadata: ErrorMetadata = {}
    const code = typeof value.code === 'string' ? value.code : options.code
    if (code !== undefined) {
      metadata.code = code
    }
    if (value.cause !== undefined) {
      metadata.cause = value.cause
    }
    if (options.context !== undefined) {
      metadata.context = options.context
    }
    if (value.details !== undefined) {
      metadata.details = value.details
    }

    const message =
      typeof value.message === 'string'
        ? value.message
        : (options.fallbackMessage ?? 'Unknown error')
    const error = new AppError(message, metadata)

    if (typeof value.name === 'string' && value.name.length > 0) {
      error.name = value.name
    }

    if (typeof value.stack === 'string') {
      error.stack = value.stack
    }

    if (value.context && typeof value.context === 'object') {
      ;(error as AppError & { context?: Record<string, unknown> }).context = {
        ...(value.context as Record<string, unknown>),
        ...(options.context ?? {}),
      }
    }

    return error
  }

  const metadata: ErrorMetadata = {
    context: {
      ...(options.context ?? {}),
      value,
    },
  }
  if (options.code !== undefined) {
    metadata.code = options.code
  }

  return new AppError(options.fallbackMessage ?? 'Unknown error', metadata)
}

export function hasErrorCode<TCode extends string>(
  value: unknown,
  code: TCode,
): value is Error & { code: TCode } {
  if (!value || typeof value !== 'object') {
    return false
  }

  return (value as { code?: unknown }).code === code
}
