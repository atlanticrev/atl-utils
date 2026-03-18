import { describe, expect, it } from 'vitest'

import {
  type HttpAdapterRequest,
  HttpFeatureNotSupportedError,
  createFetchHttpAdapter,
} from '../src/http/index.js'

function createAdapterRequest(overrides: Partial<HttpAdapterRequest> = {}): HttpAdapterRequest {
  return {
    url: 'https://example.test/upload',
    method: 'POST',
    headers: new Headers(),
    body: null,
    responseType: 'auto',
    ...overrides,
  }
}

describe('fetch http adapter', () => {
  it('delegates to injected fetch and maps withCredentials to include', async () => {
    let capturedInput: string | URL | Request | undefined
    let capturedInit: (RequestInit & { duplex?: 'half' }) | undefined

    const adapter = createFetchHttpAdapter({
      fetch: (async (input, init) => {
        capturedInput = input
        capturedInit = init as RequestInit & { duplex?: 'half' }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        })
      }) as typeof fetch,
    })

    const result = await adapter(
      createAdapterRequest({
        headers: new Headers({
          'x-test': '1',
        }),
        withCredentials: true,
        body: 'demo',
      }),
    )

    expect(capturedInput).toBe('https://example.test/upload')
    expect(capturedInit?.method).toBe('POST')
    expect(capturedInit?.credentials).toBe('include')
    expect(new Headers(capturedInit?.headers).get('x-test')).toBe('1')
    expect(result.url).toBe('https://example.test/upload')
  })

  it('throws when upload progress is requested', async () => {
    const adapter = createFetchHttpAdapter({
      fetch: (async () => new Response(null, { status: 204 })) as typeof fetch,
    })

    await expect(
      adapter(
        createAdapterRequest({
          onUploadProgress() {},
        }),
      ),
    ).rejects.toBeInstanceOf(HttpFeatureNotSupportedError)
  })

  it('sets duplex half for ReadableStream request bodies', async () => {
    let capturedInit: (RequestInit & { duplex?: 'half' }) | undefined

    const adapter = createFetchHttpAdapter({
      fetch: (async (_input, init) => {
        capturedInit = init as RequestInit & { duplex?: 'half' }
        return new Response(null, { status: 204 })
      }) as typeof fetch,
    })

    const stream =
      typeof ReadableStream !== 'undefined'
        ? new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array([1, 2, 3]))
              controller.close()
            },
          })
        : null

    if (!stream) {
      return
    }

    await adapter(
      createAdapterRequest({
        body: stream,
      }),
    )

    expect(capturedInit?.duplex).toBe('half')
  })

  it('emits download progress when response body is streamable', async () => {
    if (typeof ReadableStream === 'undefined') {
      return
    }

    const progressValues: Array<number | null> = []
    const loadedValues: number[] = []

    const adapter = createFetchHttpAdapter({
      fetch: (async () => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2]))
            controller.enqueue(new Uint8Array([3, 4, 5]))
            controller.close()
          },
        })

        return new Response(body, {
          status: 200,
          headers: {
            'content-length': '5',
            'content-type': 'application/octet-stream',
          },
        })
      }) as typeof fetch,
    })

    const result = await adapter(
      createAdapterRequest({
        method: 'GET',
        body: null,
        onDownloadProgress(progress) {
          progressValues.push(progress.progress)
          loadedValues.push(progress.loaded)
        },
      }),
    )

    await result.response.arrayBuffer()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(loadedValues[0]).toBe(0)
    expect(loadedValues.at(-1)).toBe(5)
    expect(progressValues.at(-1)).toBe(1)
  })

  it('throws when no runtime fetch is available and no explicit implementation is passed', () => {
    const runtime = globalThis as unknown as { fetch: typeof fetch | undefined }
    const originalFetch = runtime.fetch

    try {
      runtime.fetch = undefined
      expect(() => createFetchHttpAdapter()).toThrow(HttpFeatureNotSupportedError)
    } finally {
      runtime.fetch = originalFetch
    }
  })
})
