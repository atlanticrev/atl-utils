import { AppError, createAbortLikeError, createRangeError } from '../errors/index.js'

export type WithTimeoutOptions = {
  timeoutMs: number
  signal?: AbortSignal | null
  message?: string
  onTimeout?: () => void
}

export class AsyncTimeoutError extends AppError {
  readonly timeoutMs: number

  constructor(
    timeoutMs: number,
    message = `Operation timed out after ${timeoutMs}ms`,
    cause?: unknown,
  ) {
    super(message, {
      code: 'ASYNC_TIMEOUT',
      cause,
    })
    this.name = 'AsyncTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

function normalizeTimeoutMs(timeoutMs: number): number {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw createRangeError('`timeoutMs` must be a finite positive number', {
      code: 'INVALID_TIMEOUT',
      context: {
        timeoutMs,
      },
    })
  }

  return Math.trunc(timeoutMs)
}

export async function withTimeout<T>(
  input: PromiseLike<T> | (() => PromiseLike<T> | T),
  options: WithTimeoutOptions,
): Promise<T> {
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs)
  const signal = options.signal ?? undefined

  if (signal?.aborted) {
    throw signal.reason ?? createAbortLikeError('Operation aborted')
  }

  return await new Promise<T>((resolve, reject) => {
    let settled = false

    const timeoutId = setTimeout(() => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      options.onTimeout?.()
      reject(new AsyncTimeoutError(timeoutMs, options.message))
    }, timeoutMs)

    const onAbort = () => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      reject(signal?.reason ?? createAbortLikeError('Operation aborted'))
    }

    const cleanup = () => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort, { once: true })

    Promise.resolve()
      .then(() => (typeof input === 'function' ? input() : input))
      .then(
        (value) => {
          if (settled) {
            return
          }

          settled = true
          cleanup()
          resolve(value)
        },
        (error) => {
          if (settled) {
            return
          }

          settled = true
          cleanup()
          reject(error)
        },
      )
  })
}
