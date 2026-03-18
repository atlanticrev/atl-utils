export type DeferredState = 'pending' | 'fulfilled' | 'rejected'

export type Deferred<T> = {
  readonly promise: Promise<T>
  readonly settled: boolean
  readonly state: DeferredState
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: unknown): void
}

export function createDeferred<T>(): Deferred<T> {
  let state: DeferredState = 'pending'
  let resolvePromise!: (value: T | PromiseLike<T>) => void
  let rejectPromise!: (reason?: unknown) => void

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = (value) => {
      if (state !== 'pending') {
        return
      }

      state = 'fulfilled'
      resolve(value)
    }

    rejectPromise = (reason) => {
      if (state !== 'pending') {
        return
      }

      state = 'rejected'
      reject(reason)
    }
  })

  return {
    promise,
    get settled() {
      return state !== 'pending'
    },
    get state() {
      return state
    },
    resolve: resolvePromise,
    reject: rejectPromise,
  }
}
