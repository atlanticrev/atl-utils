# `http/adapters`

Адаптеры для `httpClient`.

Экспорт:
- `createFetchHttpAdapter`
- `createXhrHttpAdapter`

## Когда какой adapter используется

- `fetch` — дефолт для большинства запросов
- `xhr` — нужен для `onUploadProgress`

`HttpClient` сам переключается на `xhr`, если в конфиге запроса есть `onUploadProgress`.

## Прямое использование `fetch` adapter

```ts
import { createFetchHttpAdapter } from '@atlanticrev/atl-utils/http'

const fetchAdapter = createFetchHttpAdapter()
```

Можно передать кастомный `fetch` (например, для тестов):

```ts
const adapter = createFetchHttpAdapter({
  fetch: async (input, init) => {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})
```

## Прямое использование `xhr` adapter

```ts
import { createXhrHttpAdapter } from '@atlanticrev/atl-utils/http'

const xhrAdapter = createXhrHttpAdapter()
```

Подходит для:
- upload progress
- совместимого поведения в браузерах без `fetch`-upload progress

Важно:
- `xhr` adapter рассчитан на browser runtime (`XMLHttpRequest`).
