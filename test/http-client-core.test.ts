import { describe, expect, it, vi } from 'vitest'

import {
  HttpAbortError,
  type HttpAdapter,
  HttpTimeoutError,
  createHttpClient,
} from '../src/http/index.js'

describe('HttpClient core behaviors', () => {
  it('requestData returns parsed data only', async () => {
    const adapter: HttpAdapter = async (request) => ({
      response: new Response(JSON.stringify({ value: 42 }), {
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

    const data = await client.requestData<{ value: number }>({
      url: 'https://example.test/value',
      method: 'GET',
      responseType: 'json',
    })

    expect(data).toEqual({ value: 42 })
  })

  it('returns non-2xx response when throwOnHttpError is disabled', async () => {
    const adapter: HttpAdapter = async (request) => ({
      response: new Response(JSON.stringify({ code: 'NOT_FOUND' }), {
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

    const response = await client.get<{ code: string }>('https://example.test/missing', {
      responseType: 'json',
      throwOnHttpError: false,
      retry: false,
    })

    expect(response.status).toBe(404)
    expect(response.data).toEqual({ code: 'NOT_FOUND' })
  })

  it('respects custom validateStatus', async () => {
    const adapter: HttpAdapter = async (request) => ({
      response: new Response('not found but accepted', {
        status: 404,
        headers: {
          'content-type': 'text/plain',
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

    const response = await client.get<string>('https://example.test/custom', {
      responseType: 'text',
      validateStatus: (status) => status === 404,
      retry: false,
    })

    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
    expect(response.data).toBe('not found but accepted')
  })

  it('throws HttpTimeoutError when timeout elapses', async () => {
    vi.useFakeTimers()

    try {
      const adapter: HttpAdapter = (request) =>
        new Promise((_resolve, reject) => {
          if (request.signal?.aborted) {
            reject(request.signal.reason ?? new Error('aborted'))
            return
          }

          request.signal?.addEventListener(
            'abort',
            () => {
              reject(request.signal?.reason ?? new Error('aborted'))
            },
            { once: true },
          )
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

      const promise = client.get('https://example.test/slow', {
        timeoutMs: 100,
        retry: false,
      })
      const assertion = expect(promise).rejects.toBeInstanceOf(HttpTimeoutError)

      await vi.advanceTimersByTimeAsync(101)

      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws HttpAbortError when request signal is aborted', async () => {
    const adapter: HttpAdapter = (request) =>
      new Promise((_resolve, reject) => {
        if (request.signal?.aborted) {
          reject(request.signal.reason ?? new DOMException('Aborted', 'AbortError'))
          return
        }

        request.signal?.addEventListener(
          'abort',
          () => {
            reject(request.signal?.reason ?? new DOMException('Aborted', 'AbortError'))
          },
          { once: true },
        )
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

    const controller = new AbortController()
    controller.abort()

    await expect(
      client.get('https://example.test/abort', {
        signal: controller.signal,
        retry: false,
      }),
    ).rejects.toBeInstanceOf(HttpAbortError)
  })

  it('setDefaults merges headers, params and response schemas', async () => {
    const seenUrls: string[] = []
    const seenHeaders: string[] = []

    const adapter: HttpAdapter = async (request) => {
      seenUrls.push(request.url)
      seenHeaders.push(new Headers(request.headers).get('x-base') ?? '')
      seenHeaders.push(new Headers(request.headers).get('x-extra') ?? '')

      const isOk = request.url.includes('/ok')

      return {
        response: new Response(JSON.stringify({ kind: isOk ? 'ok' : 'teapot' }), {
          status: isOk ? 200 : 418,
          headers: {
            'content-type': 'application/json',
          },
        }),
        url: request.url,
      }
    }

    const client = createHttpClient(
      {
        baseUrl: 'https://api.example.com',
        headers: {
          'x-base': '1',
        },
        params: {
          source: 'base',
        },
        schema: {
          response: {
            default: {
              parse(value) {
                return {
                  bucket: 'default',
                  ...(value as Record<string, unknown>),
                }
              },
            },
          },
        },
      },
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    client.setDefaults({
      headers: {
        'x-extra': '2',
      },
      params: {
        env: 'test',
      },
      schema: {
        response: {
          '2xx': {
            parse(value) {
              return {
                bucket: '2xx',
                ...(value as Record<string, unknown>),
              }
            },
          },
        },
      },
    })

    const ok = await client.get<{ bucket: string; kind: string }>('/ok', {
      responseType: 'json',
      throwOnHttpError: false,
      retry: false,
    })

    const teapot = await client.get<{ bucket: string; kind: string }>('/teapot', {
      responseType: 'json',
      throwOnHttpError: false,
      retry: false,
    })

    expect(ok.data).toEqual({ bucket: '2xx', kind: 'ok' })
    expect(teapot.data).toEqual({ bucket: 'default', kind: 'teapot' })
    expect(seenUrls[0]).toContain('https://api.example.com/ok?')
    expect(seenUrls[0]).toContain('source=base')
    expect(seenUrls[0]).toContain('env=test')
    expect(seenHeaders).toContain('1')
    expect(seenHeaders).toContain('2')
  })

  it('extend inherits middleware and merges defaults with child overrides', async () => {
    let capturedUrl = ''
    let capturedHeaders = new Headers()

    const adapter: HttpAdapter = async (request) => {
      capturedUrl = request.url
      capturedHeaders = new Headers(request.headers)

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

    const parent = createHttpClient(
      {
        baseUrl: 'https://api.example.com',
        headers: {
          'x-parent': '1',
        },
        params: {
          lang: 'en',
        },
      },
      {
        adapters: {
          fetch: adapter,
          xhr: adapter,
        },
      },
    )

    parent.use({
      onRequest(config) {
        const headers = new Headers(config.headers)
        headers.set('x-middleware', 'parent')
        return {
          ...config,
          headers,
        }
      },
    })

    const child = parent.extend({
      headers: {
        'x-child': '1',
      },
      params: {
        feature: 'beta',
      },
    })

    await child.get('/users', {
      responseType: 'json',
      params: {
        page: 1,
      },
      retry: false,
    })

    expect(capturedUrl).toContain('https://api.example.com/users?')
    expect(capturedUrl).toContain('lang=en')
    expect(capturedUrl).toContain('feature=beta')
    expect(capturedUrl).toContain('page=1')
    expect(capturedHeaders.get('x-parent')).toBe('1')
    expect(capturedHeaders.get('x-child')).toBe('1')
    expect(capturedHeaders.get('x-middleware')).toBe('parent')
  })
})
