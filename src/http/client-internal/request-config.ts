import { DEFAULT_HTTP_RETRY_OPTIONS, normalizeRetryOptions } from '../retry.js'
import { buildUrl, mergeHeaders, serializeHttpBody } from '../serialize.js'
import type {
  HttpClientDefaults,
  HttpRequestConfig,
  HttpResponseType,
  ResolvedHttpRequestConfig,
} from '../types.js'
import { mergeSchemaConfig } from './schema-config.js'

const normalizeMethod = (method?: string): string => {
  return (method ?? 'GET').toUpperCase()
}

const normalizeResponseType = (value: HttpResponseType | undefined): HttpResponseType => {
  return value ?? 'auto'
}

const normalizeErrorResponseType = (value: HttpResponseType | undefined): HttpResponseType => {
  if (!value) {
    return 'auto'
  }

  if (value === 'stream') {
    return 'text'
  }

  return value
}

const defaultValidateStatus = (status: number): boolean => {
  return status >= 200 && status < 300
}

const normalizeTimeoutMs = (value: number | undefined): number | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value) || value <= 0) {
    return undefined
  }

  return Math.trunc(value)
}

export const cloneRequestConfig = (config: HttpRequestConfig): HttpRequestConfig => {
  return {
    ...config,
    headers: config.headers ? new Headers(config.headers) : undefined,
    params: config.params ? { ...config.params } : undefined,
    middlewares: config.middlewares ? [...config.middlewares] : undefined,
    meta: config.meta ? { ...config.meta } : undefined,
  }
}

export const mergeQueryParams = (
  defaultsParams: HttpRequestConfig['params'],
  requestParams: HttpRequestConfig['params'],
): HttpRequestConfig['params'] => {
  if (!defaultsParams && !requestParams) {
    return undefined
  }

  return {
    ...(defaultsParams ?? {}),
    ...(requestParams ?? {}),
  }
}

export const mergeRequestConfig = (
  defaults: HttpClientDefaults,
  request: HttpRequestConfig,
): HttpRequestConfig => {
  return {
    ...defaults,
    ...request,
    headers: mergeHeaders(defaults.headers, request.headers),
    params: mergeQueryParams(defaults.params, request.params),
    schema: mergeSchemaConfig(defaults.schema, request.schema),
  }
}

export const prepareRequestConfig = (config: HttpRequestConfig): ResolvedHttpRequestConfig => {
  const headers = new Headers(config.headers)

  const serialized = serializeHttpBody({
    headers,
    data: config.data,
    body: config.body,
    bodyType: config.bodyType ?? 'auto',
  })

  const requestUrl = buildUrl(config.url, {
    baseUrl: config.baseUrl,
    params: config.params,
    paramsSerializer: config.paramsSerializer,
  })

  return {
    url: config.url,
    requestUrl,
    method: normalizeMethod(config.method),
    baseUrl: config.baseUrl,
    headers: serialized.headers,
    params: config.params ? { ...config.params } : undefined,
    data: config.data,
    body: serialized.body,
    bodyType: serialized.bodyType,
    responseType: normalizeResponseType(config.responseType),
    errorResponseType: normalizeErrorResponseType(config.errorResponseType),
    timeoutMs: normalizeTimeoutMs(config.timeoutMs),
    signal: config.signal ?? undefined,
    retry: normalizeRetryOptions(config.retry ?? DEFAULT_HTTP_RETRY_OPTIONS.retries),
    validateStatus: config.validateStatus ?? defaultValidateStatus,
    throwOnHttpError: config.throwOnHttpError ?? true,
    credentials: config.credentials,
    withCredentials: config.withCredentials,
    mode: config.mode,
    cache: config.cache,
    redirect: config.redirect,
    referrer: config.referrer,
    referrerPolicy: config.referrerPolicy,
    integrity: config.integrity,
    keepalive: config.keepalive,
    adapter: config.adapter ?? 'auto',
    paramsSerializer: config.paramsSerializer,
    onUploadProgress: config.onUploadProgress,
    onDownloadProgress: config.onDownloadProgress,
    parseJson: config.parseJson,
    schema: config.schema,
    meta: config.meta ? { ...config.meta } : undefined,
  }
}
