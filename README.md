# utils

`ESM-only` utility library for personal projects.

## Goals

- TypeScript-first
- framework-agnostic (no React/Vue/etc dependencies)
- fast lint/build/test cycle (`Biome`, `tsup`, `Vitest`, `pnpm`)
- tree-shakeable exports via `sideEffects: false` and subpath imports

## Structure

```txt
src/
  index.ts
  styles/
    index.ts
    clsx.ts
  storages/
    index.ts
    cookie.ts
    local-storage.ts
    session-storage.ts
    cache-storage.ts
    indexed-db.ts
  http/
    index.ts
    client.ts
    errors.ts
    types.ts
    serialize.ts
    retry.ts
    middleware.ts
    adapters/
      fetch.ts
      xhr.ts
  date-and-time/
    index.ts
    format-date.ts
```

## Install in another project (GitHub Packages)

```bash
pnpm add @atlanticrev/atl-utils
```

Consumer project `.npmrc`:

```ini
@atlanticrev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Usage

Prefer subpath imports for the cleanest tree-shaking:

```ts
import { clsx } from '@atlanticrev/atl-utils/styles/clsx'
import { formatDate } from '@atlanticrev/atl-utils/date-and-time/format-date'
```

Category barrels are also available:

```ts
import { clsx } from '@atlanticrev/atl-utils/styles'
import { createLocalStorageStore } from '@atlanticrev/atl-utils/storages'
import { createHttpClient } from '@atlanticrev/atl-utils/http'
```

Root barrel works too, but subpaths are better for explicit imports:

```ts
import { clsx, formatDate } from '@atlanticrev/atl-utils'
```

## Scripts

- `pnpm build` - build `dist/` (`ESM + .d.ts`)
- `pnpm lint` - lint with Biome
- `pnpm typecheck` - TypeScript check
- `pnpm test` - run Vitest
- `pnpm pack:check` - package quality checks (`publint`, `attw`)

## Browser Storages

`/storages` includes practical wrappers for browser storage APIs:

- `cookie` (`document.cookie`) with attributes, JSON helpers, prefix scoping
- `local-storage` and `session-storage` with CRUD + JSON helpers + prefix scoping
- `cache-storage` (Cache Storage API) with `Response` / text / JSON helpers
- `indexed-db` with DB open/schema upgrade helpers and CRUD for object stores/indexes

## HTTP Client

`/http` provides an adapter-based modern HTTP client:

- default `fetch` adapter
- optional `xhr` adapter for upload progress (`onUploadProgress`)
- middleware pipeline (`onRequest`, `onResponse`, `onError`)
- timeout, cancellation (`AbortSignal`), retries with backoff
- body serializers (`json`, `multipart/form-data`, `url-encoded`, `text`, `raw`)
- optional request/response schema validation (`parse` / `safeParse`, status-based response schemas)
- typed errors (`HttpResponseError`, `HttpTimeoutError`, etc.)

Example (schema validation, library-agnostic):

```ts
import { createHttpClient } from '@atlanticrev/atl-utils/http'

const http = createHttpClient()

const result = await http.post<{ id: string }>('/users', { name: 'Alex' }, {
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
      201: {
        safeParse(value) {
          const data = value as { id?: unknown }
          return typeof data.id === 'string'
            ? { success: true, data: { id: data.id } }
            : { success: false, error: new Error('Invalid response shape') }
        },
      },
      default: {
        parse(value) {
          return value
        },
      },
    },
  },
})
```

## Publish (GitHub Packages)

Before publishing:

- run `pnpm install` and commit `pnpm-lock.yaml`
- bump version (`npm version patch`)
- make sure `GITHUB_TOKEN` has access to `write:packages`

Manual publish:

```bash
export GITHUB_TOKEN=YOUR_GITHUB_PACKAGES_TOKEN
pnpm build
npm publish
```

For a one-command release, use `pnpm release:patch`.

The repo also includes a GitHub Actions publish workflow
(`.github/workflows/publish.yml`) that uses `GITHUB_TOKEN`.
