import { createAbortLikeError, createRangeError } from '../errors/index.js'

export type SleepOptions<T> = {
  signal?: AbortSignal | null
  value?: T
}

function normalizeDelayMs(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) {
    throw createRangeError('`ms` must be a finite non-negative number', {
      code: 'INVALID_DELAY',
      context: {
        ms,
      },
    })
  }

  return Math.trunc(ms)
}

export function sleep(ms: number): Promise<void>
export function sleep<T>(ms: number, options: SleepOptions<T>): Promise<T>
export function sleep<T>(ms: number, options: SleepOptions<T> = {}): Promise<T | undefined> {
  const delayMs = normalizeDelayMs(ms)
  const signal = options.signal ?? undefined

  if (signal?.aborted) {
    return Promise.reject(signal.reason ?? createAbortLikeError('Sleep aborted'))
  }

  return new Promise<T | undefined>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup()
      resolve(options.value)
    }, delayMs)

    const onAbort = () => {
      cleanup()
      reject(signal?.reason ?? createAbortLikeError('Sleep aborted'))
    }

    const cleanup = () => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
