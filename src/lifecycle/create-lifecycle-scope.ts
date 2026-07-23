export type DisposeCallback = () => void

export type LifecycleScope = {
  readonly disposed: boolean
  readonly signal: AbortSignal
  createChild: () => LifecycleScope
  dispose: () => void
  onDispose: (callback: DisposeCallback) => () => void
}

const throwDisposeErrors = (errors: unknown[]): void => {
  if (errors.length === 0) return
  if (errors.length === 1) throw errors[0]

  throw new AggregateError(errors, 'Multiple lifecycle cleanup callbacks failed')
}

export const createLifecycleScope = (): LifecycleScope => {
  const controller = new AbortController()
  const callbacks = new Set<DisposeCallback>()
  let disposed = false

  const onDispose = (callback: DisposeCallback): (() => void) => {
    if (disposed) {
      callback()
      return () => undefined
    }

    callbacks.add(callback)

    return () => callbacks.delete(callback)
  }

  const dispose = (): void => {
    if (disposed) return

    disposed = true
    const errors: unknown[] = []

    try {
      controller.abort()
    } catch (error) {
      errors.push(error)
    }

    for (const callback of [...callbacks].reverse()) {
      try {
        callback()
      } catch (error) {
        errors.push(error)
      }
    }

    callbacks.clear()
    throwDisposeErrors(errors)
  }

  return {
    get disposed() {
      return disposed
    },
    signal: controller.signal,
    createChild: () => {
      const child = createLifecycleScope()
      onDispose(child.dispose)
      return child
    },
    dispose,
    onDispose,
  }
}
