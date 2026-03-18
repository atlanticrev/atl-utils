import { createDefaultAdapters } from './client-internal/adapters.js'
import { mergeQueryParams } from './client-internal/request-config.js'
import { executeRequest } from './client-internal/request-executor.js'
import { cloneSchemaConfig, mergeSchemaConfig } from './client-internal/schema-config.js'
import type { CreateHttpClientOptions, HttpClientAdapters } from './client-internal/types.js'
import { HttpMiddlewareRegistry } from './middleware.js'
import { mergeHeaders } from './serialize.js'
import type {
  HttpClientDefaults,
  HttpClientResponse,
  HttpMiddleware,
  HttpRequestConfig,
} from './types.js'

export type { CreateHttpClientOptions, HttpClientAdapters }

export class HttpClient {
  private defaultsValue: HttpClientDefaults
  private readonly middlewareRegistry = new HttpMiddlewareRegistry()
  private readonly adapters: HttpClientAdapters

  constructor(defaults: HttpClientDefaults = {}, options: CreateHttpClientOptions = {}) {
    this.defaultsValue = { ...defaults }
    this.adapters = createDefaultAdapters(options)
  }

  get defaults(): HttpClientDefaults {
    return {
      ...this.defaultsValue,
      headers: this.defaultsValue.headers ? new Headers(this.defaultsValue.headers) : undefined,
      params: this.defaultsValue.params ? { ...this.defaultsValue.params } : undefined,
      schema: cloneSchemaConfig(this.defaultsValue.schema),
    }
  }

  setDefaults(nextDefaults: Partial<HttpClientDefaults>): void {
    this.defaultsValue = {
      ...this.defaultsValue,
      ...nextDefaults,
      headers: mergeHeaders(this.defaultsValue.headers, nextDefaults.headers),
      params: mergeQueryParams(this.defaultsValue.params, nextDefaults.params),
      schema: mergeSchemaConfig(this.defaultsValue.schema, nextDefaults.schema),
    }
  }

  use(middleware: HttpMiddleware): () => void {
    return this.middlewareRegistry.use(middleware)
  }

  extend(
    defaults: Partial<HttpClientDefaults> = {},
    options: CreateHttpClientOptions = {},
  ): HttpClient {
    const client = new HttpClient(
      {
        ...this.defaultsValue,
        ...defaults,
        headers: mergeHeaders(this.defaultsValue.headers, defaults.headers),
        params: mergeQueryParams(this.defaultsValue.params, defaults.params),
        schema: mergeSchemaConfig(this.defaultsValue.schema, defaults.schema),
      },
      {
        adapters: {
          fetch: options.adapters?.fetch ?? this.adapters.fetch,
          xhr: options.adapters?.xhr ?? this.adapters.xhr,
        },
      },
    )

    for (const middleware of this.middlewareRegistry.list()) {
      client.use(middleware)
    }

    return client
  }

  request<T = unknown>(requestConfig: HttpRequestConfig): Promise<HttpClientResponse<T>> {
    return executeRequest<T>({
      requestConfig,
      defaults: this.defaultsValue,
      middlewareRegistry: this.middlewareRegistry,
      adapters: this.adapters,
    })
  }

  async requestData<T = unknown>(requestConfig: HttpRequestConfig): Promise<T> {
    const response = await this.request<T>(requestConfig)
    return response.data
  }

  get<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}) {
    return this.requestWithMethod<T>('GET', url, config)
  }

  delete<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}) {
    return this.requestWithMethod<T>('DELETE', url, config)
  }

  head<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}) {
    return this.requestWithMethod<T>('HEAD', url, config)
  }

  options<T = unknown>(url: string, config: Omit<HttpRequestConfig, 'url' | 'method'> = {}) {
    return this.requestWithMethod<T>('OPTIONS', url, config)
  }

  post<T = unknown>(
    url: string,
    data?: unknown,
    config: Omit<HttpRequestConfig, 'url' | 'method' | 'data'> = {},
  ) {
    return this.requestWithMethod<T>('POST', url, config, data)
  }

  put<T = unknown>(
    url: string,
    data?: unknown,
    config: Omit<HttpRequestConfig, 'url' | 'method' | 'data'> = {},
  ) {
    return this.requestWithMethod<T>('PUT', url, config, data)
  }

  patch<T = unknown>(
    url: string,
    data?: unknown,
    config: Omit<HttpRequestConfig, 'url' | 'method' | 'data'> = {},
  ) {
    return this.requestWithMethod<T>('PATCH', url, config, data)
  }

  private requestWithMethod<T>(
    method: string,
    url: string,
    config: Omit<HttpRequestConfig, 'url' | 'method'>,
    data?: unknown,
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      data,
      method,
    })
  }
}

export const createHttpClient = (
  defaults: HttpClientDefaults = {},
  options: CreateHttpClientOptions = {},
): HttpClient => {
  return new HttpClient(defaults, options)
}
