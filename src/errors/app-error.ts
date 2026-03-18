import type { ErrorCode, ErrorContext, ErrorMetadata } from './types.js'

function assignErrorMetadata<T extends Error>(error: T, metadata: ErrorMetadata = {}): T {
  const target = error as T & {
    code?: ErrorCode
    cause?: unknown
    context?: ErrorContext
    details?: unknown
  }

  if (metadata.code !== undefined) {
    target.code = metadata.code
  }

  if (metadata.cause !== undefined) {
    target.cause = metadata.cause
  }

  if (metadata.context !== undefined) {
    target.context = { ...metadata.context }
  }

  if (metadata.details !== undefined) {
    target.details = metadata.details
  }

  return error
}

export type AppErrorOptions = ErrorMetadata

export class AppError extends Error {
  readonly code?: ErrorCode
  readonly cause?: unknown
  readonly context?: ErrorContext
  readonly details?: unknown

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, new.target.prototype)
    assignErrorMetadata(this, options)
  }
}

export class AppTypeError extends TypeError {
  readonly code?: ErrorCode
  readonly cause?: unknown
  readonly context?: ErrorContext
  readonly details?: unknown

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message)
    this.name = 'AppTypeError'
    Object.setPrototypeOf(this, new.target.prototype)
    assignErrorMetadata(this, options)
  }
}

export class AppRangeError extends RangeError {
  readonly code?: ErrorCode
  readonly cause?: unknown
  readonly context?: ErrorContext
  readonly details?: unknown

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message)
    this.name = 'AppRangeError'
    Object.setPrototypeOf(this, new.target.prototype)
    assignErrorMetadata(this, options)
  }
}

export function createError(message: string, options: AppErrorOptions = {}): AppError {
  return new AppError(message, options)
}

export function createTypeError(message: string, options: AppErrorOptions = {}): AppTypeError {
  return new AppTypeError(message, options)
}

export function createRangeError(message: string, options: AppErrorOptions = {}): AppRangeError {
  return new AppRangeError(message, options)
}

export function createSerializationError(
  message: string,
  options: AppErrorOptions = {},
): AppTypeError {
  return new AppTypeError(message, {
    code: options.code ?? 'SERIALIZATION_ERROR',
    ...options,
  })
}

export function createRuntimeUnavailableError(
  feature: string,
  options: AppErrorOptions = {},
): AppError {
  const context = {
    feature,
    ...(options.context ?? {}),
  }

  return new AppError(`${feature} is not available in the current runtime`, {
    code: options.code ?? 'RUNTIME_UNAVAILABLE',
    ...options,
    context,
  })
}

export function createInvalidStateError(message: string, options: AppErrorOptions = {}): AppError {
  return new AppError(message, {
    code: options.code ?? 'INVALID_STATE',
    ...options,
  })
}

export function createAbortLikeError(message = 'Request aborted'): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }

  const error = new AppError(message, {
    code: 'ABORT_ERROR',
  })
  error.name = 'AbortError'
  return error
}

export function createErrorCode<const T extends string>(code: T): T {
  return code
}
