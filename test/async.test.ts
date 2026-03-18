import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AsyncTimeoutError,
  createDeferred,
  debounce,
  limitConcurrency,
  sleep,
  throttle,
  withTimeout,
} from '../src/index.js'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('async module', () => {
  it('sleep resolves after delay and returns value', async () => {
    vi.useFakeTimers()

    const promise = sleep(20, { value: 'done' })
    const assertion = expect(promise).resolves.toBe('done')

    await vi.advanceTimersByTimeAsync(20)
    await assertion
  })

  it('sleep rejects when aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(sleep(10, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('withTimeout resolves before timeout and throws AsyncTimeoutError otherwise', async () => {
    vi.useFakeTimers()

    const fastPromise = withTimeout(Promise.resolve('ok'), {
      timeoutMs: 100,
    })
    await expect(fastPromise).resolves.toBe('ok')

    let timedOut = false
    const slowPromise = withTimeout(
      new Promise<string>(() => {
        // never resolves
      }),
      {
        timeoutMs: 50,
        onTimeout() {
          timedOut = true
        },
      },
    )
    const timeoutAssertion = expect(slowPromise).rejects.toBeInstanceOf(AsyncTimeoutError)

    await vi.advanceTimersByTimeAsync(51)
    await timeoutAssertion
    expect(timedOut).toBe(true)
  })

  it('createDeferred exposes resolve/reject and state', async () => {
    const deferred = createDeferred<number>()

    expect(deferred.state).toBe('pending')
    expect(deferred.settled).toBe(false)

    deferred.resolve(42)

    await expect(deferred.promise).resolves.toBe(42)
    expect(deferred.state).toBe('fulfilled')
    expect(deferred.settled).toBe(true)
  })

  it('debounce coalesces calls and supports flush', async () => {
    vi.useFakeTimers()
    const calls: string[] = []
    const fn = debounce((value: string) => {
      calls.push(value)
      return value.toUpperCase()
    }, 20)

    expect(fn('a')).toBeUndefined()
    expect(fn('b')).toBeUndefined()
    expect(fn.pending()).toBe(true)
    expect(fn.flush()).toBe('B')
    expect(calls).toEqual(['b'])
    expect(fn.pending()).toBe(false)
  })

  it('throttle executes immediately and then trailing call', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const calls: string[] = []
    const fn = throttle((value: string) => {
      calls.push(value)
      return value
    }, 50)

    expect(fn('a')).toBe('a')
    expect(fn('b')).toBe('a')

    await vi.advanceTimersByTimeAsync(50)

    expect(calls).toEqual(['a', 'b'])
  })

  it('limitConcurrency runs only N tasks at once and exposes counters', async () => {
    const limit = limitConcurrency(2)
    let active = 0
    let maxActive = 0

    const tasks = [1, 2, 3, 4].map((value) =>
      limit(async () => {
        active += 1
        maxActive = Math.max(maxActive, active)
        await sleep(5)
        active -= 1
        return value * 2
      }),
    )

    expect(limit.pendingCount).toBeGreaterThanOrEqual(0)

    const results = await Promise.all(tasks)

    expect(results).toEqual([2, 4, 6, 8])
    expect(maxActive).toBe(2)
    expect(limit.activeCount).toBe(0)
    expect(limit.pendingCount).toBe(0)
  })
})
