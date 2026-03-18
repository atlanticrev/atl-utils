export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const isBlobLike = (value: unknown): value is Blob => {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

export const isFormDataLike = (value: unknown): value is FormData => {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

export const isUrlSearchParamsLike = (value: unknown): value is URLSearchParams => {
  return typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams
}

export const isArrayBufferLike = (value: unknown): value is ArrayBuffer => {
  return value instanceof ArrayBuffer
}

export const isArrayBufferViewLike = (value: unknown): value is ArrayBufferView => {
  return ArrayBuffer.isView(value)
}

export const isReadableStreamLike = (value: unknown): value is ReadableStream => {
  return typeof ReadableStream !== 'undefined' && value instanceof ReadableStream
}

export const isBodyInitLike = (value: unknown): value is BodyInit => {
  if (typeof value === 'string') {
    return true
  }

  return (
    isBlobLike(value) ||
    isFormDataLike(value) ||
    isUrlSearchParamsLike(value) ||
    isArrayBufferLike(value) ||
    isArrayBufferViewLike(value) ||
    isReadableStreamLike(value)
  )
}

export const normalizeScalarValue = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  return String(value)
}
