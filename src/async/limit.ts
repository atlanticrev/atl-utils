import { createInvalidStateError } from '../errors/index.js'

export type ConcurrencyLimiter = {
  <T>(task: () => PromiseLike<T> | T): Promise<T>
  readonly activeCount: number
  readonly pendingCount: number
  clearQueue(reason?: unknown): void
}

type QueueItem<T> = {
  run: () => PromiseLike<T> | T
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

export function limitConcurrency(concurrency: number): ConcurrencyLimiter {
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw createInvalidStateError('`concurrency` must be a finite integer >= 1', {
      code: 'INVALID_CONCURRENCY',
      context: {
        concurrency,
      },
    })
  }

  const maxConcurrency = Math.trunc(concurrency)
  let activeCount = 0
  const queue: QueueItem<unknown>[] = []

  const runNext = () => {
    if (activeCount >= maxConcurrency) {
      return
    }

    const next = queue.shift()
    if (!next) {
      return
    }

    activeCount += 1

    Promise.resolve()
      .then(() => next.run())
      .then(next.resolve, next.reject)
      .finally(() => {
        activeCount -= 1
        runNext()
      })
  }

  const limiter = (<T>(task: () => PromiseLike<T> | T) =>
    new Promise<T>((resolve, reject) => {
      queue.push({
        run: task as () => PromiseLike<unknown> | unknown,
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      runNext()
    })) as ConcurrencyLimiter

  Object.defineProperties(limiter, {
    activeCount: {
      get() {
        return activeCount
      },
    },
    pendingCount: {
      get() {
        return queue.length
      },
    },
  })

  limiter.clearQueue = (
    reason = createInvalidStateError('Task queue was cleared', { code: 'QUEUE_CLEARED' }),
  ) => {
    while (queue.length > 0) {
      const item = queue.shift()
      item?.reject(reason)
    }
  }

  return limiter
}
