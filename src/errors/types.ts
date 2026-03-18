export type ErrorCode = string

export type ErrorContext = Record<string, unknown>

export type ErrorMetadata = {
  code?: ErrorCode
  cause?: unknown
  context?: ErrorContext
  details?: unknown
}

export type ErrorLike = {
  name?: unknown
  message?: unknown
  stack?: unknown
  cause?: unknown
  code?: unknown
  context?: unknown
  details?: unknown
}

export type SerializedError = {
  name: string
  message: string
  code?: string
  stack?: string
  context?: ErrorContext
  details?: unknown
  cause?: SerializedError | unknown
}

export type SerializeErrorOptions = {
  includeStack?: boolean
  includeCause?: boolean
  maxCauseDepth?: number
}
