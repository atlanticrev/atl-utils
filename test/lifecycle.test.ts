import { describe, expect, it, vi } from 'vitest'

import { createLifecycleScope } from '../src/lifecycle/index.js'

describe('createLifecycleScope', () => {
  it('aborts its signal and runs cleanup callbacks in reverse order', () => {
    const scope = createLifecycleScope()
    const calls: string[] = []

    scope.onDispose(() => calls.push('first'))
    scope.onDispose(() => calls.push('second'))
    scope.dispose()

    expect(scope.disposed).toBe(true)
    expect(scope.signal.aborted).toBe(true)
    expect(calls).toEqual(['second', 'first'])
  })

  it('supports unregistering cleanup and repeated disposal', () => {
    const scope = createLifecycleScope()
    const cleanup = vi.fn()
    const unregister = scope.onDispose(cleanup)

    unregister()
    scope.dispose()
    scope.dispose()

    expect(cleanup).not.toHaveBeenCalled()
  })

  it('runs cleanup registered after disposal immediately', () => {
    const scope = createLifecycleScope()
    const cleanup = vi.fn()

    scope.dispose()
    scope.onDispose(cleanup)

    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('disposes child scopes with their parent', () => {
    const parent = createLifecycleScope()
    const child = parent.createChild()
    const childCleanup = vi.fn()

    child.onDispose(childCleanup)
    parent.dispose()

    expect(child.disposed).toBe(true)
    expect(childCleanup).toHaveBeenCalledOnce()
  })

  it('attempts every cleanup and reports multiple failures', () => {
    const scope = createLifecycleScope()
    const successfulCleanup = vi.fn()

    scope.onDispose(() => {
      throw new Error('first failure')
    })
    scope.onDispose(successfulCleanup)
    scope.onDispose(() => {
      throw new Error('second failure')
    })

    expect(() => scope.dispose()).toThrow(AggregateError)
    expect(successfulCleanup).toHaveBeenCalledOnce()
  })
})
