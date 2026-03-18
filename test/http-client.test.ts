import { describe, expect, it } from 'vitest'

import {
  type HttpAdapter,
  type HttpMiddleware,
  HttpResponseError,
  HttpSchemaValidationError,
  createHttpClient,
} from '../src/http/index.js'

describe('HttpClient', () => {
  it('applies request middleware and retries on retriable status', async () => {
    let calls = 0

    const adapter: HttpAdapter = async (request) => {
      calls += 1
      expect(request.headers.get('x-test')).toBe('1')

      if (calls === 1) {
        return {
          response: new Response(JSON.stringify({ error: 'temporary' }), {
            status: 503,
            headers: {
              'content-type': 'application/json',
            },
          }),
          url: request.url,
        }
      }

      return {
        response: new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
        url: request.url,
      }
    }

    const client = createHttpClient(
      {},
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    client.use({
      onRequest(config) {
        const headers = new Headers(config.headers)
        headers.set('x-test', '1')

        return {
          ...config,
          headers,
        }
      },
    })

    const response = await client.get<{ ok: boolean }>('https://example.test/health', {
      responseType: 'json',
      retry: {
        retries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
        jitter: 'none',
      },
      adapter: 'fetch',
    })

    expect(response.data).toEqual({ ok: true })
    expect(calls).toBe(2)
  })

  it('invokes onRetry callback with response retry payload', async () => {
    let calls = 0
    const retryPayloads: Array<{
      attempt: number
      delayMs: number
      status: number | undefined
      method: string
      requestUrl: string
    }> = []

    const adapter: HttpAdapter = async (request) => {
      calls += 1

      return {
        response: new Response(JSON.stringify({ attempt: calls }), {
          status: calls === 1 ? 503 : 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
        url: request.url,
      }
    }

    const client = createHttpClient(
      {},
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    const response = await client.get<{ attempt: number }>('https://example.test/retry-callback', {
      responseType: 'json',
      retry: {
        retries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
        jitter: 'none',
        onRetry(context) {
          retryPayloads.push({
            attempt: context.attempt,
            delayMs: context.delayMs,
            status: context.response?.status,
            method: context.config.method,
            requestUrl: context.config.requestUrl,
          })
        },
      },
    })

    expect(response.data).toEqual({ attempt: 2 })
    expect(calls).toBe(2)
    expect(retryPayloads).toEqual([
      {
        attempt: 1,
        delayMs: 0,
        status: 503,
        method: 'GET',
        requestUrl: 'https://example.test/retry-callback',
      },
    ])
  })

  it('switches to xhr adapter when onUploadProgress is provided', async () => {
    let usedAdapter: 'fetch' | 'xhr' | null = null

    const fetchAdapter: HttpAdapter = async (request) => {
      usedAdapter = 'fetch'
      return {
        response: new Response(JSON.stringify({ adapter: 'fetch' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
        url: request.url,
      }
    }

    const xhrAdapter: HttpAdapter = async (request) => {
      usedAdapter = 'xhr'
      return {
        response: new Response(JSON.stringify({ adapter: 'xhr' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
        url: request.url,
      }
    }

    const client = createHttpClient(
      {},
      {
        adapters: {
          fetch: fetchAdapter,
          xhr: xhrAdapter,
        },
      },
    )

    const response = await client.post<{ adapter: string }>(
      'https://example.test/upload',
      { fileName: 'demo.txt' },
      {
        bodyType: 'json',
        responseType: 'json',
        onUploadProgress() {},
      },
    )

    expect(response.data.adapter).toBe('xhr')
    expect(usedAdapter).toBe('xhr')
  })

  it('applies global middlewares before per-request middlewares in request/response pipeline', async () => {
    const events: string[] = []
    let headerOrder = ''

    const adapter: HttpAdapter = async (request) => {
      headerOrder = request.headers.get('x-order') ?? ''
      events.push('adapter')

      return {
        response: new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
        url: request.url,
      }
    }

    const client = createHttpClient(
      {},
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    const createMiddleware = (name: string): HttpMiddleware => ({
      onRequest(config) {
        events.push(`${name}:request`)
        const headers = new Headers(config.headers)
        const current = headers.get('x-order')
        headers.set('x-order', current ? `${current}>${name}` : name)

        return {
          ...config,
          headers,
        }
      },
      onResponse(response: Response) {
        events.push(`${name}:response`)
        return response
      },
    })

    client.use(createMiddleware('global-1'))
    client.use(createMiddleware('global-2'))

    await client.get('https://example.test/middleware-order', {
      responseType: 'json',
      retry: false,
      middlewares: [createMiddleware('request-1')],
    })

    expect(headerOrder).toBe('global-1>global-2>request-1')
    expect(events).toEqual([
      'global-1:request',
      'global-2:request',
      'request-1:request',
      'adapter',
      'global-1:response',
      'global-2:response',
      'request-1:response',
    ])
  })

  it('throws typed HttpResponseError for non-2xx responses', async () => {
    const adapter: HttpAdapter = async (request) => ({
      response: new Response(JSON.stringify({ message: 'not found' }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
        },
      }),
      url: request.url,
    })

    const client = createHttpClient(
      {},
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    await expect(
      client.get('https://example.test/missing', {
        responseType: 'json',
        retry: false,
      }),
    ).rejects.toBeInstanceOf(HttpResponseError)
  })

  it('validates and transforms request data via schema', async () => {
    let capturedBody: unknown

    const adapter: HttpAdapter = async (request) => {
      capturedBody = request.body

      return {
        response: new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
        url: request.url,
      }
    }

    const client = createHttpClient(
      {},
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    await client.post(
      'https://example.test/items',
      { count: '2' },
      {
        bodyType: 'json',
        responseType: 'json',
        schema: {
          request: {
            data: {
              parse(value) {
                const input = value as { count?: unknown }
                return {
                  count: Number(input.count ?? 0),
                }
              },
            },
          },
        },
      },
    )

    expect(capturedBody).toBe('{"count":2}')
  })

  it('validates response schema by status and throws HttpSchemaValidationError', async () => {
    const adapter: HttpAdapter = async (request) => ({
      response: new Response(JSON.stringify({ ok: 'yes' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
      url: request.url,
    })

    const client = createHttpClient(
      {},
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    await expect(
      client.get('https://example.test/schema', {
        responseType: 'json',
        schema: {
          response: {
            '2xx': {
              safeParse(value) {
                const payload = value as { ok?: unknown }

                if (typeof payload.ok === 'boolean') {
                  return {
                    success: true as const,
                    data: payload,
                  }
                }

                return {
                  success: false as const,
                  error: new Error('`ok` must be boolean'),
                }
              },
            },
          },
        },
      }),
    ).rejects.toBeInstanceOf(HttpSchemaValidationError)
  })
})
