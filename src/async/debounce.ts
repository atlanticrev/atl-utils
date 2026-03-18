import { createRangeError } from '../errors/index.js'

export type DebounceOptions = {
  leading?: boolean
  trailing?: boolean
}

export type DebouncedFunction<TArgs extends unknown[], TResult> = {
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

export function debounce<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  waitMs: number,
  options: DebounceOptions = {},
): DebouncedFunction<TArgs, TResult> {
  const wait = normalizeWait(waitMs)
  const leading = options.leading ?? false
  const trailing = options.trailing ?? true

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let pendingArgs: TArgs | undefined
  let lastResult: TResult | undefined
  let hasLeadingCalled = false

  const invoke = (args: TArgs) => {
    lastResult = fn(...args)
    return lastResult
  }

  const clearTimer = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
  }

  const startTimer = () => {
    clearTimer()
    timeoutId = setTimeout(() => {
      timeoutId = undefined

      if (trailing && pendingArgs) {
        invoke(pendingArgs)
      }

      pendingArgs = undefined
      hasLeadingCalled = false
    }, wait)
  }

  const debounced = ((...args: TArgs) => {
    pendingArgs = args

    if (leading && !hasLeadingCalled) {
      hasLeadingCalled = true
      const result = invoke(args)

      if (trailing) {
        startTimer()
      } else {
        clearTimer()
        timeoutId = setTimeout(() => {
          timeoutId = undefined
          pendingArgs = undefined
          hasLeadingCalled = false
        }, wait)
      }

      return result
    }

    if (trailing) {
      startTimer()
    }

    return lastResult
  }) as DebouncedFunction<TArgs, TResult>

  debounced.cancel = () => {
    clearTimer()
    pendingArgs = undefined
    hasLeadingCalled = false
  }

  debounced.flush = () => {
    if (!pendingArgs) {
      return lastResult
    }

    clearTimer()
    const args = pendingArgs
    pendingArgs = undefined
    hasLeadingCalled = false
    return invoke(args)
  }

  debounced.pending = () => timeoutId !== undefined

  return debounced
}
