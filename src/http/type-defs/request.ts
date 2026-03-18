import type {
  HttpAdapterName,
  HttpBodyType,
  HttpJitterMode,
  HttpMethod,
  HttpProgressHandler,
  HttpQueryParams,
  HttpResponseType,
  HttpSchemaConfig,
} from './model.js'
import type { HttpAdapter, HttpMiddleware } from './transport.js'

export type HttpRetryDecisionContext = {
  attempt: number
  config: ResolvedHttpRequestConfig
  error?: unknown
  response?: Response | undefined
}

export type HttpRetryOptions = {
  retries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffFactor: number
  jitter: HttpJitterMode
  retryMethods: string[]
  retryOnStatuses: number[]
  respectRetryAfter: boolean
  shouldRetry?: ((context: HttpRetryDecisionContext) => boolean | Promise<boolean>) | undefined
  onRetry?:
    | ((context: HttpRetryDecisionContext & { delayMs: number }) => void | Promise<void>)
    | undefined
}

export type HttpRetryInput = false | number | Partial<HttpRetryOptions>

export type HttpRequestConfig = {
  url: string
  method?: HttpMethod | undefined
  baseUrl?: string | undefined
  headers?: HeadersInit | undefined
  params?: HttpQueryParams | undefined
  paramsSerializer?: ((params: HttpQueryParams) => string) | undefined
  data?: unknown
  body?: BodyInit | null | undefined
  bodyType?: HttpBodyType | undefined
  responseType?: HttpResponseType | undefined
  errorResponseType?: HttpResponseType | undefined
  timeoutMs?: number | undefined
  signal?: AbortSignal | null | undefined
  retry?: HttpRetryInput | undefined
  validateStatus?: ((status: number) => boolean) | undefined
  throwOnHttpError?: boolean | undefined
  credentials?: RequestCredentials | undefined
  withCredentials?: boolean | undefined
  mode?: RequestMode | undefined
  cache?: RequestCache | undefined
  redirect?: RequestRedirect | undefined
  referrer?: string | undefined
  referrerPolicy?: ReferrerPolicy | undefined
  integrity?: string | undefined
  keepalive?: boolean | undefined
  adapter?: HttpAdapterName | HttpAdapter | undefined
  middlewares?: HttpMiddleware[] | undefined
  onUploadProgress?: HttpProgressHandler | undefined
  onDownloadProgress?: HttpProgressHandler | undefined
  parseJson?: ((value: string) => unknown) | undefined
  schema?: HttpSchemaConfig | undefined
  meta?: Record<string, unknown> | undefined
}

export type HttpClientDefaults = Omit<HttpRequestConfig, 'url' | 'middlewares'>

export type ResolvedHttpRequestConfig = {
  url: string
  requestUrl: string
  method: string
  baseUrl?: string | undefined
  headers: Headers
  params?: HttpQueryParams | undefined
  data?: unknown
  body: BodyInit | null
  bodyType: HttpBodyType
  responseType: HttpResponseType
  errorResponseType: HttpResponseType
  timeoutMs?: number | undefined
  signal?: AbortSignal | null | undefined
  retry: HttpRetryOptions
  validateStatus: (status: number) => boolean
  throwOnHttpError: boolean
  credentials?: RequestCredentials | undefined
  withCredentials?: boolean | undefined
  mode?: RequestMode | undefined
  cache?: RequestCache | undefined
  redirect?: RequestRedirect | undefined
  referrer?: string | undefined
  referrerPolicy?: ReferrerPolicy | undefined
  integrity?: string | undefined
  keepalive?: boolean | undefined
  adapter: HttpAdapterName | HttpAdapter
  paramsSerializer?: ((params: HttpQueryParams) => string) | undefined
  onUploadProgress?: HttpProgressHandler | undefined
  onDownloadProgress?: HttpProgressHandler | undefined
  parseJson?: ((value: string) => unknown) | undefined
  schema?: HttpSchemaConfig | undefined
  meta?: Record<string, unknown> | undefined
}
