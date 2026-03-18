import { createAbortLikeError, createError } from '../../errors/index.js'
import type { AbortComposition } from './types.js'

const createAbortError = (message = 'Request aborted'): Error => {
  return createAbortLikeError(message)
}

export const createAbortComposition = (
  signal: AbortSignal | null | undefined,
  timeoutMs: number | undefined,
): AbortComposition => {
  if (!signal && timeoutMs === undefined) {
    return {
      signal: undefined,
      cleanup: () => {},
      didTimeout: () => false,
      wasAborted: () => false,
    }
  }

  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  let aborted = false

  const abortFromSignal = (): void => {
    aborted = true
    controller.abort(signal?.reason)
  }

  if (signal) {
    if (signal.aborted) {
      abortFromSignal()
    } else {
      signal.addEventListener('abort', abortFromSignal, { once: true })
    }
  }

  if (timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort(
        typeof DOMException !== 'undefined'
          ? new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError')
          : createError(`Request timed out after ${timeoutMs}ms`, {
              code: 'HTTP_REQUEST_TIMEOUT',
            }),
      )
    }, timeoutMs)
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }

      if (signal) {
        signal.removeEventListener('abort', abortFromSignal)
      }
    },
    didTimeout: () => timedOut,
    wasAborted: () => aborted || Boolean(signal?.aborted),
  }
}

export const delayWithAbort = async (ms: number, signal?: AbortSignal | null): Promise<void> => {
  if (ms <= 0) {
    return
  }

  if (signal?.aborted) {
    throw signal.reason ?? createAbortError()
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    const onAbort = (): void => {
      cleanup()
      reject(signal?.reason ?? createAbortError())
    }

    const cleanup = (): void => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
