import { afterEach, describe, expect, it } from 'vitest'

import {
  type HttpAdapterRequest,
  HttpNetworkError,
  createXhrHttpAdapter,
} from '../src/http/index.js'

type ProgressEventLike = {
  lengthComputable: boolean
  loaded: number
  total: number
}

class FakeXMLHttpRequest {
  static instances: FakeXMLHttpRequest[] = []

  static reset(): void {
    FakeXMLHttpRequest.instances = []
  }

  static last(): FakeXMLHttpRequest {
    const instance = FakeXMLHttpRequest.instances.at(-1)
    if (!instance) {
      throw new Error('No FakeXMLHttpRequest instances were created')
    }

    return instance
  }

  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onprogress: ((event: ProgressEventLike) => void) | null = null

  readonly upload: { onprogress: ((event: ProgressEventLike) => void) | null } = {
    onprogress: null,
  }

  method = ''
  url = ''
  async = true
  responseType: XMLHttpRequestResponseType = ''
  withCredentials = false
  status = 0
  statusText = ''
  responseURL = ''
  response: unknown = null
  responseText = ''
  sentBody: unknown = null
  rawResponseHeaders = ''
  aborted = false
  readonly requestHeaders = new Map<string, string>()

  constructor() {
    FakeXMLHttpRequest.instances.push(this)
  }

  open(method: string, url: string, async = true): void {
    this.method = method
    this.url = url
    this.async = async
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders.set(name, value)
  }

  getAllResponseHeaders(): string {
    return this.rawResponseHeaders
  }

  send(body: unknown): void {
    this.sentBody = body
  }

  abort(): void {
    this.aborted = true
    this.onabort?.()
  }

  emitUploadProgress(event: Partial<ProgressEventLike> = {}): void {
    this.upload.onprogress?.({
      lengthComputable: event.lengthComputable ?? true,
      loaded: event.loaded ?? 0,
      total: event.total ?? 0,
    })
  }

  emitDownloadProgress(event: Partial<ProgressEventLike> = {}): void {
    this.onprogress?.({
      lengthComputable: event.lengthComputable ?? true,
      loaded: event.loaded ?? 0,
      total: event.total ?? 0,
    })
  }

  respond(options: {
    status: number
    statusText?: string
    responseURL?: string
    headers?: string
    response?: unknown
    responseText?: string
  }): void {
    this.status = options.status
    this.statusText = options.statusText ?? this.statusText
    this.responseURL = options.responseURL ?? this.responseURL
    this.rawResponseHeaders = options.headers ?? this.rawResponseHeaders

    if (options.response !== undefined) {
      this.response = options.response
    }

    if (options.responseText !== undefined) {
      this.responseText = options.responseText
    }

    this.onload?.()
  }

  failNetwork(): void {
    this.onerror?.()
  }
}

function createAdapterRequest(overrides: Partial<HttpAdapterRequest> = {}): HttpAdapterRequest {
  return {
    url: 'https://example.test/resource',
    method: 'POST',
    headers: new Headers(),
    body: null,
    responseType: 'auto',
    ...overrides,
  }
}

const globalWithXhr = globalThis as typeof globalThis & {
  XMLHttpRequest?: typeof XMLHttpRequest
}

const originalXmlHttpRequest = globalWithXhr.XMLHttpRequest

afterEach(() => {
  globalWithXhr.XMLHttpRequest = originalXmlHttpRequest
  FakeXMLHttpRequest.reset()
})

describe('xhr http adapter', () => {
  it('propagates headers/credentials and resolves successful responses', async () => {
    globalWithXhr.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest

    const adapter = createXhrHttpAdapter()
    const promise = adapter(
      createAdapterRequest({
        method: 'GET',
        withCredentials: true,
        headers: new Headers({
          'x-token': 'abc',
        }),
      }),
    )

    const xhr = FakeXMLHttpRequest.last()

    expect(xhr.method).toBe('GET')
    expect(xhr.url).toBe('https://example.test/resource')
    expect(xhr.withCredentials).toBe(true)
    expect(xhr.requestHeaders.get('x-token')).toBe('abc')

    xhr.respond({
      status: 200,
      statusText: 'OK',
      responseURL: 'https://example.test/resource?ok=1',
      headers: 'content-type: application/json\r\nx-id: 1\r\n',
      responseText: '{"ok":true}',
    })

    const result = await promise

    expect(result.url).toBe('https://example.test/resource?ok=1')
    expect(result.response.status).toBe(200)
    expect(result.response.headers.get('content-type')).toBe('application/json')
    expect(await result.response.text()).toBe('{"ok":true}')
  })

  it('emits upload and download progress callbacks', async () => {
    globalWithXhr.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest

    const uploadProgress: Array<number | null> = []
    const downloadProgress: Array<number | null> = []

    const adapter = createXhrHttpAdapter()
    const promise = adapter(
      createAdapterRequest({
        onUploadProgress(progress) {
          uploadProgress.push(progress.progress)
        },
        onDownloadProgress(progress) {
          downloadProgress.push(progress.progress)
        },
      }),
    )

    const xhr = FakeXMLHttpRequest.last()

    xhr.emitUploadProgress({ loaded: 5, total: 10 })
    xhr.emitDownloadProgress({ loaded: 20, total: 40 })

    xhr.respond({
      status: 200,
      responseText: 'ok',
    })

    await promise

    expect(uploadProgress).toContain(0.5)
    expect(downloadProgress).toContain(0.5)
  })

  it('normalizes status 1223 to 204', async () => {
    globalWithXhr.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest

    const adapter = createXhrHttpAdapter()
    const promise = adapter(
      createAdapterRequest({
        method: 'HEAD',
      }),
    )

    const xhr = FakeXMLHttpRequest.last()

    xhr.respond({
      status: 1223,
      statusText: 'No Content',
    })

    const result = await promise

    expect(result.response.status).toBe(204)
    expect(await result.response.text()).toBe('')
  })

  it('maps network errors to HttpNetworkError', async () => {
    globalWithXhr.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest

    const adapter = createXhrHttpAdapter()
    const promise = adapter(createAdapterRequest())

    const xhr = FakeXMLHttpRequest.last()
    xhr.failNetwork()

    await expect(promise).rejects.toBeInstanceOf(HttpNetworkError)
  })

  it('rejects with abort error when aborted via signal', async () => {
    globalWithXhr.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest

    const adapter = createXhrHttpAdapter()
    const controller = new AbortController()
    const promise = adapter(
      createAdapterRequest({
        signal: controller.signal,
      }),
    )

    const xhr = FakeXMLHttpRequest.last()
    controller.abort()

    await expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(xhr.aborted).toBe(true)
  })
})
