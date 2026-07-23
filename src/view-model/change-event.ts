export const VIEW_MODEL_CHANGE_EVENT = 'change'

export type ViewModelPropertyChange<State extends object> = {
  [Key in keyof State]-?: {
    key: Key
    previousValue: State[Key]
    value: State[Key]
  }
}[keyof State]

export class ViewModelChangeEvent<State extends object> extends Event {
  public readonly changedKeys: ReadonlySet<keyof State>
  public readonly changes: readonly ViewModelPropertyChange<State>[]

  public constructor(changes: readonly ViewModelPropertyChange<State>[]) {
    super(VIEW_MODEL_CHANGE_EVENT)
    this.changes = Object.freeze(
      changes.map((change) => Object.freeze({ ...change })) as ViewModelPropertyChange<State>[],
    )
    this.changedKeys = new Set(changes.map((change) => change.key))
  }

  public hasChanged(key: keyof State): boolean {
    return this.changedKeys.has(key)
  }
}
