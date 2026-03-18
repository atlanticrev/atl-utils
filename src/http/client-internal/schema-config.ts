import type { HttpResponseSchemaMap, HttpSchema, HttpSchemaConfig } from '../types.js'

export const isSchemaLike = (value: unknown): value is HttpSchema<unknown> => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as HttpSchema<unknown>

  return (
    typeof candidate.parse === 'function' ||
    typeof candidate.parseAsync === 'function' ||
    typeof candidate.safeParse === 'function' ||
    typeof candidate.safeParseAsync === 'function'
  )
}

export const isResponseSchemaMap = (
  value: HttpSchemaConfig['response'] | undefined,
): value is HttpResponseSchemaMap => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return !isSchemaLike(value)
}

export const mergeSchemaConfig = (
  defaultsSchema: HttpSchemaConfig | undefined,
  requestSchema: HttpSchemaConfig | undefined,
): HttpSchemaConfig | undefined => {
  if (!defaultsSchema && !requestSchema) {
    return undefined
  }

  const requestPart =
    defaultsSchema?.request || requestSchema?.request
      ? {
          ...(defaultsSchema?.request ?? {}),
          ...(requestSchema?.request ?? {}),
        }
      : undefined

  let responsePart: HttpSchemaConfig['response']

  if (!defaultsSchema?.response) {
    responsePart = requestSchema?.response
  } else if (!requestSchema?.response) {
    responsePart = defaultsSchema.response
  } else if (
    isResponseSchemaMap(defaultsSchema.response) &&
    isResponseSchemaMap(requestSchema.response)
  ) {
    responsePart = {
      ...defaultsSchema.response,
      ...requestSchema.response,
    }
  } else {
    responsePart = requestSchema.response
  }

  return {
    request: requestPart,
    response: responsePart,
  }
}

export const cloneSchemaConfig = (
  schema: HttpSchemaConfig | undefined,
): HttpSchemaConfig | undefined => {
  if (!schema) {
    return undefined
  }

  return {
    request: schema.request ? { ...schema.request } : undefined,
    response:
      schema.response && isResponseSchemaMap(schema.response)
        ? { ...schema.response }
        : schema.response,
  }
}
