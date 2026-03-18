import { toError } from './helpers.js'
import type { SerializeErrorOptions, SerializedError } from './types.js'

function serializeErrorInternal(
  value: unknown,
  options: Required<SerializeErrorOptions>,
  depth: number,
  seen: WeakSet<object>,
): SerializedError {
  const error = toError(value)
  const serialized: SerializedError = {
    name: error.name,
    message: error.message,
  }

  const withMeta = error as Error & {
    code?: unknown
    context?: unknown
    details?: unknown
    cause?: unknown
  }

  if (typeof withMeta.code === 'string') {
    serialized.code = withMeta.code
  }

  if (options.includeStack && typeof error.stack === 'string') {
    serialized.stack = error.stack
  }

  if (withMeta.context && typeof withMeta.context === 'object') {
    serialized.context = { ...(withMeta.context as Record<string, unknown>) }
  }

  if (withMeta.details !== undefined) {
    serialized.details = withMeta.details
  }

  if (!options.includeCause || depth >= options.maxCauseDepth) {
    return serialized
  }

  const cause = withMeta.cause
  if (cause === undefined) {
    return serialized
  }

  if (!cause || typeof cause !== 'object') {
    serialized.cause = cause
    return serialized
  }

  if (seen.has(cause)) {
    serialized.cause = '[Circular]'
    return serialized
  }

  seen.add(cause)
  serialized.cause = serializeErrorInternal(cause, options, depth + 1, seen)
  return serialized
}

export function serializeError(
  value: unknown,
  options: SerializeErrorOptions = {},
): SerializedError {
  const normalizedOptions: Required<SerializeErrorOptions> = {
    includeStack: options.includeStack ?? true,
    includeCause: options.includeCause ?? true,
    maxCauseDepth: Math.max(0, options.maxCauseDepth ?? 4),
  }

  const seen = new WeakSet<object>()
  if (value && typeof value === 'object') {
    seen.add(value)
  }

  return serializeErrorInternal(value, normalizedOptions, 0, seen)
}
