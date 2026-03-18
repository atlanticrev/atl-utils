import { createTypeError } from '../../errors/index.js'
import { HttpParseError } from '../errors.js'
import type { HttpResponseType, ResolvedHttpRequestConfig } from '../types.js'

const hasNoResponseBody = (response: Response): boolean => {
  return response.status === 204 || response.status === 205 || response.status === 304
}

const isJsonContentType = (contentType: string | null): boolean => {
  if (!contentType) {
    return false
  }

  const normalized = contentType.toLowerCase()
  return normalized.includes('application/json') || normalized.includes('+json')
}

const isMultipartFormContentType = (contentType: string | null): boolean => {
  return Boolean(contentType?.toLowerCase().includes('multipart/form-data'))
}

const parseJsonResponse = async (
  response: Response,
  config: ResolvedHttpRequestConfig,
  requestId: string,
): Promise<unknown> => {
  try {
    const text = await response.text()
    if (text.length === 0) {
      return null
    }

    return config.parseJson ? config.parseJson(text) : JSON.parse(text)
  } catch (error) {
    throw new HttpParseError('Failed to parse JSON response', response, 'json', {
      cause: error,
      config,
      requestId,
    })
  }
}

export const parseResponseData = async <T>(
  response: Response,
  responseType: HttpResponseType,
  config: ResolvedHttpRequestConfig,
  requestId: string,
): Promise<T> => {
  if (responseType === 'raw') {
    return response as T
  }

  if (responseType === 'stream') {
    return response.body as T
  }

  if (hasNoResponseBody(response)) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  const effectiveType =
    responseType === 'auto'
      ? isJsonContentType(contentType)
        ? 'json'
        : isMultipartFormContentType(contentType)
          ? 'formData'
          : 'text'
      : responseType

  try {
    switch (effectiveType) {
      case 'json':
        return (await parseJsonResponse(response, config, requestId)) as T
      case 'text':
        return (await response.text()) as T
      case 'blob':
        return (await response.blob()) as T
      case 'arrayBuffer':
        return (await response.arrayBuffer()) as T
      case 'formData':
        return (await response.formData()) as T
      default:
        throw createTypeError(`Unsupported response type: ${String(effectiveType)}`, {
          code: 'HTTP_UNSUPPORTED_RESPONSE_TYPE',
        })
    }
  } catch (error) {
    if (error instanceof HttpParseError) {
      throw error
    }

    throw new HttpParseError(
      `Failed to parse response as ${effectiveType}`,
      response,
      effectiveType,
      {
        cause: error,
        config,
        requestId,
      },
    )
  }
}

export const parseErrorResponseData = async (
  response: Response,
  config: ResolvedHttpRequestConfig,
  requestId: string,
): Promise<unknown> => {
  try {
    return await parseResponseData(response, config.errorResponseType, config, requestId)
  } catch {
    return undefined
  }
}
