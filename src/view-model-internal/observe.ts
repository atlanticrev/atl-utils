import { VIEW_MODEL_CHANGE_EVENT, ViewModelChangeEvent } from '../view-model/change-event.js'
import type { ViewModelListener, ViewModelObserveOptions } from '../view-model/types.js'

type RegisterDestroyCleanup = (callback: () => void) => () => void

export const observeViewModel = <State extends object>(
  target: EventTarget,
  listener: ViewModelListener<State>,
  options: ViewModelObserveOptions<State>,
  registerDestroyCleanup: RegisterDestroyCleanup,
): (() => void) => {
  if (options.signal?.aborted) return () => undefined

  const observedKeys = options.keys ? new Set(options.keys) : null
  const handleChange = (event: Event): void => {
    if (!(event instanceof ViewModelChangeEvent)) return

    const changeEvent = event as ViewModelChangeEvent<State>
    if (observedKeys && !changeEvent.changes.some((change) => observedKeys.has(change.key))) return

    listener(changeEvent)
  }

  let removeDestroyCleanup = (): void => undefined
  const unsubscribe = (): void => {
    target.removeEventListener(VIEW_MODEL_CHANGE_EVENT, handleChange)
    options.signal?.removeEventListener('abort', unsubscribe)
    removeDestroyCleanup()
  }

  target.addEventListener(VIEW_MODEL_CHANGE_EVENT, handleChange)
  removeDestroyCleanup = registerDestroyCleanup(unsubscribe)
  options.signal?.addEventListener('abort', unsubscribe, { once: true })

  return unsubscribe
}
