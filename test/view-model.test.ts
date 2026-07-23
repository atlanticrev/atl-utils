import { describe, expect, it, vi } from 'vitest'

import type { DisposeCallback, LifecycleScope } from '../src/lifecycle/index.js'
import { ViewModel, ViewModelChangeEvent, type ViewModelListener } from '../src/view-model/index.js'

type TestState = {
  count: number
  loading: boolean
  status: string
}

class TestViewModel extends ViewModel<TestState> {
  public constructor() {
    super({ count: 0, loading: false, status: 'idle' })
  }

  public get cancellationSignal(): AbortSignal {
    return this.signal
  }

  public changeCount(count: number): boolean {
    return this.setProperty('count', count)
  }

  public start(): boolean {
    return this.setProperties({ loading: true, status: 'running' })
  }

  public finish(): boolean {
    return this.setProperties({ loading: false, status: 'done' })
  }

  public addCleanup(callback: DisposeCallback): () => void {
    return this.onDestroy(callback)
  }

  public childLifecycle(): LifecycleScope {
    return this.createChildLifecycle()
  }
}

describe('ViewModel', () => {
  it('changes one property without replacing the state object', () => {
    const viewModel = new TestViewModel()
    const state = viewModel.state
    const listener = vi.fn<ViewModelListener<TestState>>()

    viewModel.observe(listener)
    viewModel.changeCount(1)

    expect(viewModel.state).toBe(state)
    expect(viewModel.state).toEqual({ count: 1, loading: false, status: 'idle' })
    expect(listener).toHaveBeenCalledOnce()

    const event = listener.mock.calls[0]?.[0]
    expect(event).toBeInstanceOf(ViewModelChangeEvent)
    expect(event?.changes).toEqual([{ key: 'count', previousValue: 0, value: 1 }])
    expect(event?.hasChanged('count')).toBe(true)
  })

  it('applies a property batch atomically and dispatches one event', () => {
    const viewModel = new TestViewModel()
    const observedStates: TestState[] = []
    const events: ViewModelChangeEvent<TestState>[] = []

    viewModel.observe((event) => {
      observedStates.push({ ...viewModel.state })
      events.push(event)
    })
    viewModel.start()

    expect(observedStates).toEqual([{ count: 0, loading: true, status: 'running' }])
    expect(events).toHaveLength(1)
    expect(events[0]?.changedKeys).toEqual(new Set(['loading', 'status']))
  })

  it('does not dispatch when property values did not change', () => {
    const viewModel = new TestViewModel()
    const listener = vi.fn()

    viewModel.observe(listener)

    expect(viewModel.changeCount(0)).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })

  it('filters observers by property and supports AbortSignal cleanup', () => {
    const viewModel = new TestViewModel()
    const observerLifecycle = new AbortController()
    const loadingListener = vi.fn()

    viewModel.observe(loadingListener, {
      keys: ['loading'],
      signal: observerLifecycle.signal,
    })

    viewModel.changeCount(1)
    viewModel.start()
    observerLifecycle.abort()
    viewModel.finish()

    expect(loadingListener).toHaveBeenCalledOnce()
  })

  it('remains compatible with the standard EventTarget API', () => {
    const viewModel = new TestViewModel()
    const listener = vi.fn()

    viewModel.addEventListener('change', listener, { once: true })
    viewModel.changeCount(1)
    viewModel.changeCount(2)

    expect(listener).toHaveBeenCalledOnce()
  })

  it('destroys owned resources and rejects later changes', () => {
    const viewModel = new TestViewModel()
    const cleanup = vi.fn()
    const listener = vi.fn()
    const child = viewModel.childLifecycle()

    viewModel.addCleanup(cleanup)
    viewModel.observe(listener)
    viewModel.destroy()
    viewModel.destroy()
    viewModel.dispatchEvent(new ViewModelChangeEvent<TestState>([]))

    expect(viewModel.destroyed).toBe(true)
    expect(viewModel.cancellationSignal.aborted).toBe(true)
    expect(child.disposed).toBe(true)
    expect(cleanup).toHaveBeenCalledOnce()
    expect(listener).not.toHaveBeenCalled()
    expect(() => viewModel.changeCount(1)).toThrow('Cannot update a destroyed ViewModel')
    expect(() => viewModel.observe(listener)).toThrow('Cannot observe a destroyed ViewModel')
  })
})
