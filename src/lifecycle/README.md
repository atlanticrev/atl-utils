# Lifecycle

`lifecycle` groups cancellation and cleanup for screens, controllers, workers, and other disposable resources.

```ts
import { createLifecycleScope } from '@atlanticrev/atl-utils/lifecycle'

const lifecycle = createLifecycleScope()
const observer = new ResizeObserver(render)

window.addEventListener('resize', render, { signal: lifecycle.signal })
observer.observe(document.body)
lifecycle.onDispose(() => observer.disconnect())

lifecycle.dispose()
```

`dispose()` aborts the scope signal and then runs registered callbacks in reverse registration order. It is safe to
call more than once. Cleanup registered after disposal runs immediately, preventing a late resource from leaking.

Child scopes can have a shorter lifetime while still being disposed with their parent:

```ts
const screen = createLifecycleScope()
const request = screen.createChild()

fetch('/api/data', { signal: request.signal })
request.dispose()
screen.dispose()
```

All callbacks are attempted even when one fails. A single cleanup error is rethrown directly; multiple failures are
reported as an `AggregateError`.
