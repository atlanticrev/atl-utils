import { createSerializationError, createTypeError } from '../../errors/index.js'
import type { HttpBodyType, SerializeHttpBodyOptions, SerializeHttpBodyResult } from '../types.js'
import { createFormData, createUrlEncodedBody } from './form-data.js'
import {
  isBodyInitLike,
  isFormDataLike,
  isPlainObject,
  isUrlSearchParamsLike,
  normalizeScalarValue,
} from './guards.js'
import { setHeaderIfMissing } from './headers.js'

const detectBodyType = (data: unknown, explicitType: HttpBodyType | undefined): HttpBodyType => {
  if (explicitType && explicitType !== 'auto') {
    return explicitType
  }

  if (data === undefined || data === null) {
    return 'raw'
  }

  if (isFormDataLike(data)) {
    return 'form-data'
  }

  if (isUrlSearchParamsLike(data)) {
    return 'url-encoded'
  }

  if (isBodyInitLike(data)) {
    return typeof data === 'string' ? 'text' : 'raw'
  }

  return 'json'
}

const jsonStringify = (value: unknown): string => {
  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    throw createSerializationError('Request body cannot be serialized to JSON', {
      code: 'HTTP_BODY_SERIALIZATION_ERROR',
    })
  }

  return serialized
}

export const serializeHttpBody = (
  options: SerializeHttpBodyOptions = {},
): SerializeHttpBodyResult => {
  const headers = options.headers ?? new Headers()

  if (options.body !== undefined && options.data !== undefined) {
    throw createTypeError('Use either `body` or `data`, not both', {
      code: 'HTTP_BODY_CONFLICT',
    })
  }

  if (options.body !== undefined) {
    return {
      headers,
      body: options.body,
      bodyType: options.bodyType ?? 'raw',
    }
  }

  const data = options.data
  const bodyType = detectBodyType(data, options.bodyType)

  if (data === undefined) {
    return {
      headers,
      body: null,
      bodyType,
    }
  }

  switch (bodyType) {
    case 'raw': {
      if (data === null) {
        return {
          headers,
          body: null,
          bodyType,
        }
      }

      if (!isBodyInitLike(data)) {
        throw createTypeError('`bodyType: "raw"` requires a BodyInit-compatible value', {
          code: 'HTTP_INVALID_RAW_BODY',
        })
      }

      return {
        headers,
        body: data,
        bodyType,
      }
    }

    case 'text': {
      setHeaderIfMissing(headers, 'content-type', 'text/plain;charset=UTF-8')
      return {
        headers,
        body: typeof data === 'string' ? data : normalizeScalarValue(data),
        bodyType,
      }
    }

    case 'json': {
      setHeaderIfMissing(headers, 'content-type', 'application/json')
      return {
        headers,
        body: jsonStringify(data),
        bodyType,
      }
    }

    case 'form-data': {
      if (!isFormDataLike(data) && !isPlainObject(data)) {
        throw createTypeError('`bodyType: "form-data"` requires FormData or a plain object', {
          code: 'HTTP_INVALID_FORM_DATA_BODY',
        })
      }

      return {
        headers,
        body: createFormData(data),
        bodyType,
      }
    }

    case 'url-encoded': {
      if (!isUrlSearchParamsLike(data) && !isPlainObject(data)) {
        throw createTypeError(
          '`bodyType: "url-encoded"` requires URLSearchParams or a plain object',
          {
            code: 'HTTP_INVALID_URLENCODED_BODY',
          },
        )
      }

      setHeaderIfMissing(headers, 'content-type', 'application/x-www-form-urlencoded;charset=UTF-8')

      return {
        headers,
        body: createUrlEncodedBody(data),
        bodyType,
      }
    }

    case 'auto': {
      throw createTypeError('Unsupported body type: auto', {
        code: 'HTTP_UNSUPPORTED_BODY_TYPE',
      })
    }

    default: {
      throw createTypeError(`Unsupported body type: ${String(bodyType)}`, {
        code: 'HTTP_UNSUPPORTED_BODY_TYPE',
      })
    }
  }
}
