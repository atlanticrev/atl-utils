import { describe, expect, it } from 'vitest'

import {
  HttpMiddlewareRegistry,
  HttpNetworkError,
  type HttpRequestConfig,
  type ResolvedHttpRequestConfig,
  applyErrorMiddlewares,
  applyRequestMiddlewares,
  applyResponseMiddlewares,
} from '../src/http/index.js'

function createRequestConfig(overrides: Partial<HttpRequestConfig> = {}): HttpRequestConfig {
  return {
    url: 'https://example.test/resource',
    headers: new Headers(),
    ...overrides,
  }
}

function createResolvedConfig(
  overrides: Partial<ResolvedHttpRequestConfig> = {},
): ResolvedHttpRequestConfig {
  return {
    url: '/resource',
    requestUrl: 'https://example.test/resource',
    method: 'GET',
    headers: new Headers(),
    body: null,
    bodyType: 'raw',
    responseType: 'auto',
    errorResponseType: 'auto',
    retry: {
      retries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 1,
      jitter: 'none',
      retryMethods: [],
      retryOnStatuses: [],
      respectRetryAfter: true,
    },
    validateStatus: () => true,
    throwOnHttpError: true,
    adapter: 'fetch',
    ...overrides,
  } as ResolvedHttpRequestConfig
}

describe('http middleware helpers', () => {
  it('registers middlewares and unsubscribes them', () => {
    const registry = new HttpMiddlewareRegistry()
    const middleware = {}

    const unsubscribe = registry.use(middleware)

    expect(registry.list()).toEqual([middleware])

    unsubscribe()

    expect(registry.list()).toEqual([])
  })

  it('applies request middlewares in order and passes modified config forward', async () => {
    const visited: string[] = []

    const result = await applyRequestMiddlewares(
      createRequestConfig(),
      [
        {
          onRequest(config) {
            visited.push('a')
            const headers = new Headers(config.headers)
            headers.set('x-a', '1')
            return {
              ...config,
              headers,
            }
          },
        },
        {
          onRequest(config) {
            visited.push(`b:${new Headers(config.headers).get('x-a')}`)
            const headers = new Headers(config.headers)
            headers.set('x-b', '2')
            return {
              ...config,
              headers,
            }
          },
        },
      ],
      {
        requestId: 'req_1',
        attempt: 1,
        startedAtMs: 0,
      },
    )

    const headers = new Headers(result.headers)

    expect(visited).toEqual(['a', 'b:1'])
    expect(headers.get('x-a')).toBe('1')
    expect(headers.get('x-b')).toBe('2')
  })

  it('applies response middlewares and allows response replacement', async () => {
    const response = new Response('ok', { status: 200 })

    const result = await applyResponseMiddlewares(
      response,
      [
        {
          onResponse() {
            return new Response('replaced', {
              status: 201,
              headers: {
                'content-type': 'text/plain',
              },
            })
          },
        },
      ],
      {
        requestId: 'req_1',
        attempt: 1,
        startedAtMs: 0,
        config: createResolvedConfig(),
      },
    )

    expect(result.status).toBe(201)
    expect(await result.text()).toBe('replaced')
  })

  it('applies error middlewares and replaces errors from return and throw', async () => {
    const first = await applyErrorMiddlewares(
      new Error('original'),
      [
        {
          onError() {
            return new HttpNetworkError('wrapped')
          },
        },
      ],
      {
        requestId: 'req_1',
        attempt: 1,
        startedAtMs: 0,
        config: createResolvedConfig(),
      },
    )

    expect(first).toBeInstanceOf(HttpNetworkError)
    expect((first as Error).message).toBe('wrapped')

    const second = await applyErrorMiddlewares(
      new Error('original'),
      [
        {
          onError() {
            throw new Error('thrown by middleware')
          },
        },
      ],
      {
        requestId: 'req_2',
        attempt: 1,
        startedAtMs: 0,
        config: createResolvedConfig(),
      },
    )

    expect(second).toBeInstanceOf(Error)
    expect((second as Error).message).toBe('thrown by middleware')
  })
})
