export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | (string & {})

export type HttpResponseType =
  | 'auto'
  | 'json'
  | 'text'
  | 'blob'
  | 'arrayBuffer'
  | 'formData'
  | 'stream'
  | 'raw'

export type HttpBodyType = 'auto' | 'json' | 'form-data' | 'url-encoded' | 'text' | 'raw'

export type HttpAdapterName = 'auto' | 'fetch' | 'xhr'

export type HttpJitterMode = 'none' | 'full' | 'equal'

export type HttpSchemaSafeParseSuccess<T> = {
  success: true
  data: T
}

export type HttpSchemaSafeParseFailure = {
  success: false
  error: unknown
}

export type HttpSchemaSafeParseResult<T> =
  | HttpSchemaSafeParseSuccess<T>
  | HttpSchemaSafeParseFailure

export type HttpSchema<T = unknown> = {
  parse?: ((value: unknown) => T | Promise<T>) | undefined
  parseAsync?: ((value: unknown) => Promise<T>) | undefined
  safeParse?:
    | ((value: unknown) => HttpSchemaSafeParseResult<T> | Promise<HttpSchemaSafeParseResult<T>>)
    | undefined
  safeParseAsync?: ((value: unknown) => Promise<HttpSchemaSafeParseResult<T>>) | undefined
}

export type HttpRequestSchemaConfig = {
  params?: HttpSchema<HttpQueryParams> | undefined
  headers?: HttpSchema<HeadersInit> | undefined
  data?: HttpSchema<unknown> | undefined
}

export type HttpResponseSchemaMap = {
  default?: HttpSchema<unknown> | undefined
  [statusCode: string]: HttpSchema<unknown> | undefined
}

export type HttpSchemaConfig = {
  request?: HttpRequestSchemaConfig | undefined
  response?: HttpSchema<unknown> | HttpResponseSchemaMap | undefined
}

export type HttpProgressInfo = {
  direction: 'upload' | 'download'
  loaded: number
  total: number | null
  lengthComputable: boolean
  progress: number | null
  event?: ProgressEvent<EventTarget> | undefined
}

export type HttpProgressHandler = (progress: HttpProgressInfo) => void

export type HttpQueryParams = Record<string, unknown>
