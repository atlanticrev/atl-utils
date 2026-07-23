import type { ViewModelChangeEvent } from './change-event.js'

export type ViewModelListener<State extends object> = (event: ViewModelChangeEvent<State>) => void

export type ViewModelObserveOptions<State extends object> = {
  keys?: readonly (keyof State)[]
  signal?: AbortSignal
}
