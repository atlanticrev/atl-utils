import { createRangeError } from '../errors/index.js'

export type ThrottleOptions = {
  leading?: boolean
  trailing?: boolean
}

export type ThrottledFunction<TArgs extends unknown[], TResult> = {
  (...args: TArgs): TResult | undefined
  cancel(): void
  flush(): TResult | undefined
  pending(): boolean
}

function normalizeWait(waitMs: number): number {
  if (!Number.isFinite(waitMs) || waitMs < 0) {
    throw createRangeError('`waitMs` must be a finite non-negative number', {
      code: 'INVALID_WAIT',
      context: {
        waitMs,
      },
    })
  }

  return Math.trunc(waitMs)
}

export function throttle<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  waitMs: number,
  options: ThrottleOptions = {},
): ThrottledFunction<TArgs, TResult> {
  const wait = normalizeWait(waitMs)
  const leading = options.leading ?? true
  const trailing = options.trailing ?? true

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let lastInvokeMs = 0
  let pendingArgs: TArgs | undefined
  let lastResult: TResult | undefined

  const invoke = (args: TArgs) => {
    lastInvokeMs = Date.now()
    lastResult = fn(...args)
    return lastResult
  }

  const clearTimer = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
  }

  const scheduleTrailing = () => {
    if (!trailing || !pendingArgs) {
      return
    }

    const remaining = Math.max(0, wait - (Date.now() - lastInvokeMs))

    clearTimer()
    timeoutId = setTimeout(() => {
      timeoutId = undefined

      if (!pendingArgs) {
        return
      }

      const args = pendingArgs
      pendingArgs = undefined
      invoke(args)
    }, remaining)
  }

  const throttled = ((...args: TArgs) => {
    const now = Date.now()

    if (lastInvokeMs === 0 && !leading) {
      lastInvokeMs = now
    }

    const remaining = wait - (now - lastInvokeMs)
    pendingArgs = args

    if (remaining <= 0 || remaining > wait) {
      clearTimer()
      const callArgs = pendingArgs
      pendingArgs = undefined
      if (callArgs) {
        return invoke(callArgs)
      }

      return lastResult
    }

    scheduleTrailing()
    return lastResult
  }) as ThrottledFunction<TArgs, TResult>

  throttled.cancel = () => {
    clearTimer()
    pendingArgs = undefined
    lastInvokeMs = 0
  }

  throttled.flush = () => {
    if (!pendingArgs) {
      return lastResult
    }

    clearTimer()
    const args = pendingArgs
    pendingArgs = undefined
    return invoke(args)
  }

  throttled.pending = () => timeoutId !== undefined

  return throttled
}
