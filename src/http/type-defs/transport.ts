import type {
  HttpBodyType,
  HttpProgressHandler,
  HttpQueryParams,
  HttpResponseType,
} from './model.js'
import type { HttpRequestConfig, ResolvedHttpRequestConfig } from './request.js'

export type HttpAdapterRequest = {
  url: string
  method: string
  headers: Headers
  body: BodyInit | null
  signal?: AbortSignal | undefined
  credentials?: RequestCredentials | undefined
  withCredentials?: boolean | undefined
  mode?: RequestMode | undefined
  cache?: RequestCache | undefined
  redirect?: RequestRedirect | undefined
  referrer?: string | undefined
  referrerPolicy?: ReferrerPolicy | undefined
  integrity?: string | undefined
  keepalive?: boolean | undefined
  responseType: HttpResponseType
  onUploadProgress?: HttpProgressHandler | undefined
  onDownloadProgress?: HttpProgressHandler | undefined
}

export type HttpAdapterResult = {
  response: Response
  url: string
}

export type HttpAdapter = (request: HttpAdapterRequest) => Promise<HttpAdapterResult>

export type HttpMiddlewareContext = {
  requestId: string
  attempt: number
  startedAtMs: number
}

export type HttpRequestMiddleware = (
  config: HttpRequestConfig,
  context: HttpMiddlewareContext,
) => undefined | HttpRequestConfig | Promise<undefined | HttpRequestConfig>

export type HttpResponseMiddleware = (
  response: Response,
  context: HttpMiddlewareContext & { config: ResolvedHttpRequestConfig },
) => undefined | Response | Promise<undefined | Response>

export type HttpErrorMiddleware = (
  error: unknown,
  context: HttpMiddlewareContext & { config?: ResolvedHttpRequestConfig | undefined },
) => undefined | Error | Promise<undefined | Error>

export type HttpMiddleware = {
  onRequest?: HttpRequestMiddleware | undefined
  onResponse?: HttpResponseMiddleware | undefined
  onError?: HttpErrorMiddleware | undefined
}

export type HttpClientResponse<T = unknown> = {
  data: T
  status: number
  statusText: string
  ok: boolean
  headers: Headers
  url: string
  raw: Response
  requestId: string
  attempt: number
  durationMs: number
  config: ResolvedHttpRequestConfig
}

export type SerializeHttpBodyOptions = {
  headers?: Headers | undefined
  data?: unknown
  body?: BodyInit | null | undefined
  bodyType?: HttpBodyType | undefined
}

export type SerializeHttpBodyResult = {
  headers: Headers
  body: BodyInit | null
  bodyType: HttpBodyType
}

export type HttpQuerySerializer = (params: HttpQueryParams) => string
