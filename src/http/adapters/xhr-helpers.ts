import { createAbortLikeError } from '../../errors/index.js'
import { HttpFeatureNotSupportedError } from '../errors.js'
import type { HttpAdapterRequest, HttpProgressInfo } from '../types.js'

export const getXmlHttpRequestConstructor = (): typeof XMLHttpRequest => {
  if (typeof XMLHttpRequest === 'undefined') {
    throw new HttpFeatureNotSupportedError('XMLHttpRequest is not available in the current runtime')
  }

  return XMLHttpRequest
}

export const parseResponseHeaders = (rawHeaders: string): Headers => {
  const headers = new Headers()

  for (const line of rawHeaders.split(/\r?\n/)) {
    if (!line) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    headers.append(key, value)
  }

  return headers
}

export const emitProgress = (
  callback: ((progress: HttpProgressInfo) => void) | undefined,
  direction: 'upload' | 'download',
  event: ProgressEvent<EventTarget>,
): void => {
  if (!callback) {
    return
  }

  const total = event.lengthComputable ? event.total : null

  callback({
    direction,
    loaded: event.loaded,
    total,
    lengthComputable: event.lengthComputable,
    progress: total && total > 0 ? event.loaded / total : null,
    event,
  })
}

export const resolveXhrResponseType = (
  responseType: HttpAdapterRequest['responseType'],
): XMLHttpRequestResponseType => {
  switch (responseType) {
    case 'arrayBuffer':
      return 'arraybuffer'
    case 'blob':
      return 'blob'
    default:
      return 'text'
  }
}

export const createAbortDomException = (message = 'Request aborted'): Error => {
  return createAbortLikeError(message)
}
