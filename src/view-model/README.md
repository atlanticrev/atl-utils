# View model

`view-model` provides a lightweight MVVM base built on the standard `EventTarget` API. A view model owns its state,
commands, requests, and lifecycle. Views can read state and invoke commands, but only the view model can mutate state.

```ts
import { ViewModel } from '@atlanticrev/atl-utils/view-model'

type SearchState = {
  loading: boolean
  query: string
  resultCount: number
}

class SearchViewModel extends ViewModel<SearchState> {
  public constructor() {
    super({ loading: false, query: '', resultCount: 0 })
  }

  public setQuery(query: string): void {
    this.setProperty('query', query)
  }

  public startSearch(): void {
    this.setProperties({ loading: true, resultCount: 0 })
  }
}
```

`setProperty` changes one property. `setProperties` applies a small property batch atomically: every value is written
before one `change` event is dispatched. The state object keeps the same identity and is never replaced wholesale.

```ts
const viewModel = new SearchViewModel()
const screen = new AbortController()

viewModel.observe(() => render(viewModel.state), {
  signal: screen.signal,
})

viewModel.observe(() => renderLoader(viewModel.state.loading), {
  keys: ['loading'],
  signal: screen.signal,
})
```

`observe` is a typed convenience wrapper around `EventTarget`. Raw `addEventListener` remains available, but callers
must then manage its lifetime themselves. Destroying a view model aborts its protected `signal`, disposes child
lifecycles and cleanup callbacks, and removes listeners registered through `observe`.

State is shallow: replace changed arrays or nested objects through `setProperty` instead of mutating them in place.
The module intentionally does not implement proxies, decorators, automatic dependency tracking, DOM rendering, or
framework-specific hooks.
