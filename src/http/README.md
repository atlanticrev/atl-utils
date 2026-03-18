# `http`

Универсальный HTTP client на современных Web API.

Ключевые возможности:
- `fetch` adapter по умолчанию
- `xhr` adapter для `upload progress`
- middleware (`onRequest`, `onResponse`, `onError`)
- timeout / cancel (`AbortController`)
- retry с backoff/jitter и `Retry-After`
- body serializers (`json`, `form-data`, `url-encoded`, `text`, `raw`)
- response parsing (`json`, `text`, `blob`, `arrayBuffer`, `raw`, `auto`)
- schema validation (library-agnostic)
- typed errors

## Быстрый старт

```ts
import { createHttpClient } from '@atlanticrev/atl-utils/http'

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeoutMs: 10_000,
  headers: {
    'x-app': 'web',
  },
})

const response = await http.get<{ users: Array<{ id: string }> }>('/users', {
  responseType: 'json',
})

console.log(response.data.users)
```

## Middleware

```ts
import { createHttpClient } from '@atlanticrev/atl-utils/http'

const http = createHttpClient()

http.use({
  onRequest(config) {
    const headers = new Headers(config.headers)
    headers.set('authorization', 'Bearer token')
    return { ...config, headers }
  },
  onError(error) {
    console.error(error)
    return error instanceof Error ? error : undefined
  },
})
```

## Retry / timeout / cancel

```ts
const controller = new AbortController()

const result = await http.get('/health', {
  responseType: 'json',
  signal: controller.signal,
  timeoutMs: 3000,
  retry: {
    retries: 2,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    jitter: 'none',
  },
})
```

## Upload progress (авто-переключение на XHR adapter)

```ts
const form = new FormData()
form.append('file', file)

await http.post('/upload', form, {
  bodyType: 'form-data',
  responseType: 'json',
  onUploadProgress(progress) {
    console.log(progress.loaded, progress.total, progress.progress)
  },
})
```

Важно:
- `fetch` не дает полноценный upload progress, поэтому клиент автоматически использует `xhr` adapter при `onUploadProgress`.

## Schema validation (request + response)

Поддерживаются объекты с методами:
- `parse`
- `parseAsync`
- `safeParse`
- `safeParseAsync`

```ts
await http.post('/users', { name: ' Alex ' }, {
  bodyType: 'json',
  responseType: 'json',
  schema: {
    request: {
      data: {
        parse(value) {
          const input = value as { name?: unknown }
          if (typeof input.name !== 'string') {
            throw new Error('name is required')
          }
          return { name: input.name.trim() }
        },
      },
    },
    response: {
      '2xx': {
        parse(value) {
          const data = value as { id?: unknown }
          if (typeof data.id !== 'string') {
            throw new Error('invalid response')
          }
          return value
        },
      },
      '4xx': {
        parse(value) {
          return value
        },
      },
    },
  },
})
```

## Обработка ошибок

```ts
import {
  HttpAbortError,
  HttpResponseError,
  HttpTimeoutError,
  createHttpClient,
} from '@atlanticrev/atl-utils/http'

const http = createHttpClient()

try {
  await http.get('/users', { responseType: 'json' })
} catch (error) {
  if (error instanceof HttpTimeoutError) {
    // timeout
  } else if (error instanceof HttpAbortError) {
    // cancelled
  } else if (error instanceof HttpResponseError) {
    console.log(error.status, error.responseData)
  } else {
    throw error
  }
}
```
