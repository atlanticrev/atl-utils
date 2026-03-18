# `storages`

Browser storage utilities без привязки к фреймворкам.

Что есть сейчас:
- `cookie` — CRUD для `document.cookie` + JSON + атрибуты
- `localStorage` / `sessionStorage` — scoped store с prefix + JSON + batch операции
- `cache-storage` — `Cache Storage API` bucket wrapper
- `indexed-db` — helpers + store client для IndexedDB

## `localStorage` / `sessionStorage`

Пример (`localStorage`):

```ts
import { createLocalStorageStore } from '@atlanticrev/atl-utils/storages'

const store = createLocalStorageStore({ prefix: 'app' })

store.set('theme', 'dark')
store.setJson('session', { userId: 'u1', role: 'admin' })

const theme = store.get('theme') // "dark"
const session = store.getJson<{ userId: string; role: string }>('session')

store.remove('theme')
```

Пример (`sessionStorage`):

```ts
import { createSessionStorageStore } from '@atlanticrev/atl-utils/storages'

const sessionStore = createSessionStorageStore({ prefix: 'checkout' })
sessionStore.setJson('draft', { step: 2 })
```

Полезные методы `WebStorageStore`:
- `setMany`, `removeMany`
- `keys`, `values`, `entries`
- `clear()` — очищает только scope/prefix
- `clearAll()` — очищает весь storage

## `cookie`

Пример:

```ts
import { createCookieStorage } from '@atlanticrev/atl-utils/storages'

const cookies = createCookieStorage({
  prefix: 'app',
  defaultAttributes: {
    path: '/',
    sameSite: 'Lax',
    secure: true,
  },
})

cookies.set('theme', 'dark')
cookies.setJson('profile', { id: 'u1' }, { maxAge: 60 * 60 * 24 * 7 })

const theme = cookies.get('theme')
const profile = cookies.getJson<{ id: string }>('profile')

cookies.remove('theme')
```

Важно:
- Работает только там, где доступен `document.cookie`.

## `Cache Storage API`

Пример:

```ts
import { createBrowserCacheBucket } from '@atlanticrev/atl-utils/storages'

const cache = createBrowserCacheBucket('api-cache-v1')

await cache.putJson('/api/settings', { theme: 'dark' })

const settings = await cache.getJson<{ theme: string }>('/api/settings')
const exists = await cache.has('/api/settings')

await cache.delete('/api/settings')
```

Полезно для:
- кэширования `GET` ответов
- offline-first экранов
- warm cache между переходами

Важно:
- Это кэш `Request/Response`, а не полноценная БД сущностей.

## `IndexedDB`

Пример с schema + typed store client:

```ts
import {
  createIndexedDbStore,
  openIndexedDb,
} from '@atlanticrev/atl-utils/storages'

type Todo = {
  id: string
  title: string
  done: boolean
  createdAt: string
}

const db = await openIndexedDb({
  name: 'app-db',
  version: 1,
  stores: {
    todos: {
      keyPath: 'id',
      indexes: [{ name: 'by_done', keyPath: 'done' }],
    },
  },
})

const todos = createIndexedDbStore<Todo>(db, 'todos')

await todos.put({
  id: 't1',
  title: 'Write docs',
  done: false,
  createdAt: new Date().toISOString(),
})

const all = await todos.getAll()
const openTodos = await todos.getAllByIndex('by_done', false)
```

Низкоуровневые helper-функции тоже экспортируются:
- `idbGet`, `idbPut`, `idbDelete`, `idbTx`, `idbGetByIndex`, ...

Важно:
- `IndexedDB` и `Cache Storage` доступны только в браузере/поддерживаемых runtime.
