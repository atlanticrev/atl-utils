import { HttpFeatureNotSupportedError, HttpSchemaValidationError } from '../errors.js'
import type {
  HttpRequestConfig,
  HttpSchema,
  HttpSchemaConfig,
  ResolvedHttpRequestConfig,
} from '../types.js'
import { isSchemaLike } from './schema-config.js'
import type { SchemaValidationOptions } from './types.js'

const headersToRecord = (headers: HeadersInit | undefined): Record<string, string> => {
  const normalized = new Headers(headers)
  return Object.fromEntries(normalized.entries())
}

const normalizeHeadersInit = (value: HeadersInit): HeadersInit => {
  return value instanceof Headers ? new Headers(value) : value
}

const parseWithSchema = async <T>(
  schema: HttpSchema<T>,
  value: unknown,
  options: SchemaValidationOptions,
): Promise<T> => {
  try {
    if (typeof schema.safeParseAsync === 'function') {
      const result = await schema.safeParseAsync(value)
      if (result.success) {
        return result.data
      }

      throw new HttpSchemaValidationError(
        `Schema validation failed for ${options.phase} ${options.target}`,
        {
          phase: options.phase,
          target: options.target,
          schemaError: result.error,
          value,
          status: options.status,
          config: options.config,
          requestId: options.requestId,
        },
      )
    }

    if (typeof schema.safeParse === 'function') {
      const result = await schema.safeParse(value)
      if (result.success) {
        return result.data
      }

      throw new HttpSchemaValidationError(
        `Schema validation failed for ${options.phase} ${options.target}`,
        {
          phase: options.phase,
          target: options.target,
          schemaError: result.error,
          value,
          status: options.status,
          config: options.config,
          requestId: options.requestId,
        },
      )
    }

    if (typeof schema.parseAsync === 'function') {
      return await schema.parseAsync(value)
    }

    if (typeof schema.parse === 'function') {
      return await schema.parse(value)
    }
  } catch (error) {
    if (error instanceof HttpSchemaValidationError) {
      throw error
    }

    throw new HttpSchemaValidationError(
      `Schema validation failed for ${options.phase} ${options.target}`,
      {
        phase: options.phase,
        target: options.target,
        schemaError: error,
        value,
        status: options.status,
        config: options.config,
        requestId: options.requestId,
      },
    )
  }

  throw new HttpFeatureNotSupportedError(
    'Invalid schema object. Expected parse/safeParse/parseAsync/safeParseAsync methods.',
    {
      config: options.config,
      requestId: options.requestId,
    },
  )
}

export const validateRequestSchemas = async (
  config: HttpRequestConfig,
  requestId: string,
): Promise<HttpRequestConfig> => {
  const requestSchemas = config.schema?.request
  if (!requestSchemas) {
    return config
  }

  let nextConfig = config

  if (requestSchemas.params) {
    const validatedParams = await parseWithSchema(requestSchemas.params, config.params ?? {}, {
      phase: 'request',
      target: 'params',
      requestId,
    })

    nextConfig = {
      ...nextConfig,
      params: validatedParams as HttpRequestConfig['params'],
    }
  }

  if (requestSchemas.headers) {
    const validatedHeaders = await parseWithSchema(
      requestSchemas.headers,
      headersToRecord(nextConfig.headers),
      {
        phase: 'request',
        target: 'headers',
        requestId,
      },
    )

    nextConfig = {
      ...nextConfig,
      headers: normalizeHeadersInit(validatedHeaders as HeadersInit),
    }
  }

  if (requestSchemas.data) {
    const validatedData = await parseWithSchema(requestSchemas.data, nextConfig.data, {
      phase: 'request',
      target: 'data',
      requestId,
    })

    nextConfig = {
      ...nextConfig,
      data: validatedData,
    }
  }

  return nextConfig
}

const selectResponseSchema = (
  schemaConfig: HttpSchemaConfig['response'] | undefined,
  status: number,
): HttpSchema<unknown> | undefined => {
  if (!schemaConfig) {
    return undefined
  }

  if (isSchemaLike(schemaConfig)) {
    return schemaConfig
  }

  const exactKey = String(status)
  const familyKey = `${Math.floor(status / 100)}xx`

  return schemaConfig[exactKey] ?? schemaConfig[familyKey] ?? schemaConfig.default
}

export const validateResponseDataSchema = async <T>(
  data: T,
  response: Response,
  config: ResolvedHttpRequestConfig,
  requestId: string,
): Promise<T> => {
  const schema = selectResponseSchema(config.schema?.response, response.status)
  if (!schema) {
    return data
  }

  const validatedData = await parseWithSchema(schema, data, {
    phase: 'response',
    target: 'response',
    requestId,
    config,
    status: response.status,
  })

  return validatedData as T
}
