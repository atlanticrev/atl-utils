import {
  type DisposeCallback,
  type LifecycleScope,
  createLifecycleScope,
} from '../lifecycle/index.js'
import { observeViewModel } from '../view-model-internal/observe.js'
import { ViewModelChangeEvent, type ViewModelPropertyChange } from './change-event.js'
import type { ViewModelListener, ViewModelObserveOptions } from './types.js'

export abstract class ViewModel<State extends object> extends EventTarget {
  readonly #lifecycle = createLifecycleScope()
  readonly #state: State

  protected constructor(initialState: State) {
    super()
    this.#state = { ...initialState }
  }

  public get destroyed(): boolean {
    return this.#lifecycle.disposed
  }

  public get state(): Readonly<State> {
    return this.#state
  }

  protected get signal(): AbortSignal {
    return this.#lifecycle.signal
  }

  public readonly destroy = (): void => {
    this.#lifecycle.dispose()
  }

  public observe(
    listener: ViewModelListener<State>,
    options: ViewModelObserveOptions<State> = {},
  ): () => void {
    this.#ensureActive('observe')
    return observeViewModel(this, listener, options, this.#lifecycle.onDispose)
  }

  protected createChildLifecycle(): LifecycleScope {
    this.#ensureActive('create a child lifecycle for')
    return this.#lifecycle.createChild()
  }

  protected onDestroy(callback: DisposeCallback): () => void {
    this.#ensureActive('register cleanup for')
    return this.#lifecycle.onDispose(callback)
  }

  protected setProperty<Key extends keyof State>(key: Key, value: State[Key]): boolean {
    this.#ensureActive('update')

    const previousValue = this.#state[key]
    if (Object.is(previousValue, value)) return false

    return this.#commit([{ key, previousValue, value }])
  }

  protected setProperties(properties: Partial<State>): boolean {
    this.#ensureActive('update')

    const changes = this.#collectChanges(properties)
    if (changes.length === 0) return false

    return this.#commit(changes)
  }

  #collectChanges(properties: Partial<State>): ViewModelPropertyChange<State>[] {
    const changes: ViewModelPropertyChange<State>[] = []

    for (const key of Reflect.ownKeys(properties) as (keyof State)[]) {
      const previousValue = this.#state[key]
      const value = properties[key] as State[typeof key]

      if (Object.is(previousValue, value)) continue

      changes.push({ key, previousValue, value } as ViewModelPropertyChange<State>)
    }

    return changes
  }

  #commit(changes: readonly ViewModelPropertyChange<State>[]): true {
    for (const change of changes) this.#writeProperty(change.key, change.value)

    this.dispatchEvent(new ViewModelChangeEvent(changes))
    return true
  }

  #ensureActive(operation: string): void {
    if (this.destroyed) throw new Error(`Cannot ${operation} a destroyed ViewModel`)
  }

  #writeProperty<Key extends keyof State>(key: Key, value: State[Key]): void {
    this.#state[key] = value
  }
}
