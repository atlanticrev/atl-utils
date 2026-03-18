import { createError } from '../../errors/index.js'
import { HttpNetworkError } from '../errors.js'
import type { HttpAdapter, HttpAdapterRequest, HttpAdapterResult } from '../types.js'
import {
  createAbortDomException,
  emitProgress,
  getXmlHttpRequestConstructor,
  parseResponseHeaders,
  resolveXhrResponseType,
} from './xhr-helpers.js'

export const createXhrHttpAdapter = (): HttpAdapter => {
  const XhrConstructor = getXmlHttpRequestConstructor()

  const adapter: HttpAdapter = (request: HttpAdapterRequest): Promise<HttpAdapterResult> =>
    new Promise<HttpAdapterResult>((resolve, reject) => {
      const xhr = new XhrConstructor()
      const abortSignal = request.signal

      let settled = false

      const cleanup = (): void => {
        xhr.onload = null
        xhr.onerror = null
        xhr.onabort = null
        xhr.ontimeout = null

        if (abortSignal) {
          abortSignal.removeEventListener('abort', handleAbortSignal)
        }

        if (xhr.upload) {
          xhr.upload.onprogress = null
        }

        xhr.onprogress = null
      }

      const finalize = <T>(handler: () => T): T => {
        settled = true
        cleanup()
        return handler()
      }

      const handleAbortSignal = (): void => {
        if (!settled) {
          xhr.abort()
        }
      }

      if (abortSignal?.aborted) {
        finalize(() => reject(abortSignal.reason ?? createAbortDomException()))
        return
      }

      xhr.open(request.method, request.url, true)
      xhr.responseType = resolveXhrResponseType(request.responseType)

      if (request.withCredentials === true || request.credentials === 'include') {
        xhr.withCredentials = true
      }

      request.headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value)
      })

      if (request.onUploadProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          emitProgress(request.onUploadProgress, 'upload', event)
        }
      }

      if (request.onDownloadProgress) {
        xhr.onprogress = (event) => {
          emitProgress(request.onDownloadProgress, 'download', event)
        }
      }

      xhr.onerror = () => {
        finalize(() => reject(new HttpNetworkError('Network request failed')))
      }

      xhr.onabort = () => {
        finalize(() => reject(abortSignal?.reason ?? createAbortDomException()))
      }

      xhr.ontimeout = () => {
        finalize(() =>
          reject(
            createError('XMLHttpRequest timed out', {
              code: 'XHR_TIMEOUT',
            }),
          ),
        )
      }

      xhr.onload = () => {
        const status = xhr.status === 1223 ? 204 : xhr.status
        const statusText = xhr.statusText || ''

        if (status === 0) {
          finalize(() => reject(new HttpNetworkError('Network request failed')))
          return
        }

        const headers = parseResponseHeaders(xhr.getAllResponseHeaders())

        const responseBody: BodyInit | null =
          status === 204 || status === 205 || request.method === 'HEAD'
            ? null
            : xhr.responseType === 'arraybuffer'
              ? (xhr.response as ArrayBuffer)
              : xhr.responseType === 'blob'
                ? (xhr.response as Blob)
                : (xhr.responseText ?? '')

        const response = new Response(responseBody, {
          status,
          statusText,
          headers,
        })

        finalize(() =>
          resolve({
            response,
            url: xhr.responseURL || request.url,
          }),
        )
      }

      if (abortSignal) {
        abortSignal.addEventListener('abort', handleAbortSignal, { once: true })
      }

      xhr.send(request.body as XMLHttpRequestBodyInit | Document | null)
    })

  return adapter
}
