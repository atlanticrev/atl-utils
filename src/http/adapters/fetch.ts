import { HttpFeatureNotSupportedError } from '../errors.js'
import type {
  HttpAdapter,
  HttpAdapterRequest,
  HttpAdapterResult,
  HttpProgressInfo,
} from '../types.js'

export type CreateFetchHttpAdapterOptions = {
  fetch?: typeof fetch
}

function getFetchImplementation(explicitFetch?: typeof fetch): typeof fetch {
  if (explicitFetch) {
    return explicitFetch
  }

  if (typeof fetch === 'undefined') {
    throw new HttpFeatureNotSupportedError('Fetch API is not available in the current runtime')
  }

  return fetch
}

function reportProgress(
  callback: ((progress: HttpProgressInfo) => void) | undefined,
  direction: 'download',
  loaded: number,
  total: number | null,
): void {
  if (!callback) {
    return
  }

  callback({
    direction,
    loaded,
    total,
    lengthComputable: total !== null,
    progress: total && total > 0 ? loaded / total : null,
  })
}

function parseContentLength(response: Response): number | null {
  const header = response.headers.get('content-length')
  if (!header) {
    return null
  }

  const value = Number(header)
  if (!Number.isFinite(value) || value < 0) {
    return null
  }

  return value
}

async function monitorReadableStreamProgress(
  response: Response,
  onDownloadProgress: (progress: HttpProgressInfo) => void,
): Promise<Response> {
  if (!response.body || typeof response.body.tee !== 'function') {
    return response
  }

  const total = parseContentLength(response)
  const [consumerStream, observerStream] = response.body.tee()

  void (async () => {
    const reader = observerStream.getReader()
    let loaded = 0

    reportProgress(onDownloadProgress, 'download', 0, total)

    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) {
          reportProgress(onDownloadProgress, 'download', loaded, total)
          break
        }

        loaded += chunk.value.byteLength
        reportProgress(onDownloadProgress, 'download', loaded, total)
      }
    } catch {
      // Ignore progress observer failures; the consumer stream is still returned.
    } finally {
      reader.releaseLock()
    }
  })()

  return new Response(consumerStream, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  })
}

export function createFetchHttpAdapter(options: CreateFetchHttpAdapterOptions = {}): HttpAdapter {
  const fetchImpl = getFetchImplementation(options.fetch)

  const adapter: HttpAdapter = async (request: HttpAdapterRequest): Promise<HttpAdapterResult> => {
    if (request.onUploadProgress) {
      throw new HttpFeatureNotSupportedError(
        'Fetch adapter does not support upload progress. Use the XHR adapter for `onUploadProgress`.',
      )
    }

    const requestInit: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers: request.headers,
      body: request.body,
    }

    if (request.signal !== undefined) {
      requestInit.signal = request.signal
    }

    const credentials = request.withCredentials ? 'include' : request.credentials
    if (credentials !== undefined) {
      requestInit.credentials = credentials
    }

    if (request.mode !== undefined) {
      requestInit.mode = request.mode
    }

    if (request.cache !== undefined) {
      requestInit.cache = request.cache
    }

    if (request.redirect !== undefined) {
      requestInit.redirect = request.redirect
    }

    if (request.referrer !== undefined) {
      requestInit.referrer = request.referrer
    }

    if (request.referrerPolicy !== undefined) {
      requestInit.referrerPolicy = request.referrerPolicy
    }

    if (request.integrity !== undefined) {
      requestInit.integrity = request.integrity
    }

    if (request.keepalive !== undefined) {
      requestInit.keepalive = request.keepalive
    }

    if (
      request.body &&
      typeof ReadableStream !== 'undefined' &&
      request.body instanceof ReadableStream
    ) {
      requestInit.duplex = 'half'
    }

    const nativeResponse = await fetchImpl(request.url, requestInit)
    const response = request.onDownloadProgress
      ? await monitorReadableStreamProgress(nativeResponse, request.onDownloadProgress)
      : nativeResponse

    return {
      response,
      url: nativeResponse.url || request.url,
    }
  }

  return adapter
}
