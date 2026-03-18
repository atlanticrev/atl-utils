import type { InFlightDedupe } from './types.js'

export function createInFlightDedupe(): InFlightDedupe {
  const inFlight = new Map<string, Promise<unknown>>()

  const dedupe: InFlightDedupe = {
    get size() {
      return inFlight.size
    },
    has(key) {
      return inFlight.has(key)
    },
    run<T>(key: string, task: () => PromiseLike<T> | T): Promise<T> {
      const existing = inFlight.get(key) as Promise<T> | undefined
      if (existing) {
        return existing
      }

      const promise = Promise.resolve()
        .then(task)
        .finally(() => {
          if (inFlight.get(key) === promise) {
            inFlight.delete(key)
          }
        })

      inFlight.set(key, promise)
      return promise
    },
    delete(key) {
      return inFlight.delete(key)
    },
    clear() {
      inFlight.clear()
    },
  }

  return dedupe
}
