# `async`

Async primitives для UI, data fetching и background задач.

Что есть сейчас:
- `sleep`
- `withTimeout`
- `AsyncTimeoutError`
- `createDeferred`
- `debounce`
- `throttle`
- `limitConcurrency`

## `sleep`

```ts
import { sleep } from '@atlanticrev/atl-utils/async'

await sleep(250)

const value = await sleep(100, { value: 'done' })
// "done"
```

С `AbortSignal`:

```ts
const controller = new AbortController()
const promise = sleep(1_000, { signal: controller.signal })

controller.abort()
await promise // reject с AbortError
```

## `withTimeout`

```ts
import { AsyncTimeoutError, withTimeout } from '@atlanticrev/atl-utils/async'

try {
  const data = await withTimeout(fetch('/api/users').then((r) => r.json()), {
    timeoutMs: 3000,
  })
} catch (error) {
  if (error instanceof AsyncTimeoutError) {
    console.log('timed out')
  }
}
```

## `createDeferred`

```ts
import { createDeferred } from '@atlanticrev/atl-utils/async'

const deferred = createDeferred<number>()

setTimeout(() => deferred.resolve(42), 100)

const result = await deferred.promise
```

## `debounce`

```ts
import { debounce } from '@atlanticrev/atl-utils/async'

const runSearch = debounce((query: string) => {
  console.log(query)
}, 250)

runSearch('a')
runSearch('ab')
runSearch('abc') // выполнится только последний вызов
```

Управление:
- `cancel()`
- `flush()`
- `pending()`

## `throttle`

```ts
import { throttle } from '@atlanticrev/atl-utils/async'

const onResize = throttle(() => {
  console.log('resize')
}, 100)

window.addEventListener('resize', onResize)
```

## `limitConcurrency`

```ts
import { limitConcurrency } from '@atlanticrev/atl-utils/async'

const limit = limitConcurrency(3)

const results = await Promise.all(
  urls.map((url) => limit(() => fetch(url).then((r) => r.json()))),
)
```

Полезно для:
- ограничения параллельных запросов
- контролируемых batch-задач
- очередей импорта/выгрузки файлов
