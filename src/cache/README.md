# `cache`

Foundation-утилиты для in-memory caching и dedupe.

Что есть сейчас:
- `createMemoryCache` (TTL + LRU eviction)
- `createInFlightDedupe`
- `stableSerializeCacheKey`
- `joinCacheKey`

## `createMemoryCache`

```ts
import { createMemoryCache } from '@atlanticrev/atl-utils/cache'

const cache = createMemoryCache<string, unknown>({
  maxSize: 500,
  ttlMs: 60_000,
})

cache.set('users:list', [{ id: 'u1' }])

const users = cache.get('users:list')
const exists = cache.has('users:list')
```

Особенности:
- TTL (global через `ttlMs`, или per-entry через `set(key, value, { ttlMs })`)
- LRU eviction при `maxSize`
- `pruneExpired()`
- `getEntry()` с метаданными (`createdAt`, `updatedAt`, `accessedAt`, `expiresAt`)

## `createInFlightDedupe`

```ts
import { createInFlightDedupe } from '@atlanticrev/atl-utils/cache'

const dedupe = createInFlightDedupe()

const loadUser = (id: string) =>
  dedupe.run(`user:${id}`, async () => {
    const response = await fetch(`/api/users/${id}`)
    return response.json()
  })

const [a, b] = await Promise.all([loadUser('1'), loadUser('1')])
// реальный запрос выполнится один раз
```

## Стабильные cache keys

```ts
import { joinCacheKey, stableSerializeCacheKey } from '@atlanticrev/atl-utils/cache'

const keyA = stableSerializeCacheKey({ page: 1, filter: { active: true } })
const keyB = stableSerializeCacheKey({ filter: { active: true }, page: 1 })
// keyA === keyB

const requestKey = joinCacheKey(['users', { page: 1, sort: 'name' }])
```

Важно:
- `Function`/`Symbol`/circular structures не поддерживаются как cache keys.
