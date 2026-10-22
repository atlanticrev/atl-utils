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
  lifecycle/
    index.ts
    create-lifecycle-scope.ts
  view-model/
    index.ts
    change-event.ts
    view-model.ts
  date-and-time/
    index.ts
    format-date.ts
```

## Install in another project

```bash
pnpm add @atlanticrev/atl-utils
```

The package is public on npmjs.com. No GitHub token or scoped registry mapping is needed.

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
import { createLifecycleScope } from '@atlanticrev/atl-utils/lifecycle'
import { ViewModel } from '@atlanticrev/atl-utils/view-model'
```

Root barrel works too, but subpaths are better for explicit imports:

```ts
import { clsx, formatDate } from '@atlanticrev/atl-utils'
```

## View model and lifecycle

`/view-model` provides lightweight MVVM state built on `EventTarget`. It changes individual properties or an atomic
property batch without replacing the entire state object. `/lifecycle` combines an `AbortSignal` with deterministic
cleanup callbacks and child scopes.

```ts
import { createLifecycleScope } from '@atlanticrev/atl-utils/lifecycle'
import { ViewModel } from '@atlanticrev/atl-utils/view-model'

const lifecycle = createLifecycleScope()

class LoadingViewModel extends ViewModel<{ loading: boolean }> {
  public constructor() {
    super({ loading: false })
  }

  public start(): void {
    this.setProperty('loading', true)
  }
}

const viewModel = new LoadingViewModel()

viewModel.observe(() => console.log(viewModel.state), {
  signal: lifecycle.signal,
})
viewModel.start()
```

The modules intentionally do not provide routing, DOM rendering, proxies, automatic dependency tracking, or
framework-specific hooks.

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

## Publish (npmjs.com)

Before publishing:

- make sure the intended version is committed in `package.json`
- run `pnpm release:check`
- sign in to npmjs.com with an account that can publish under `@atlanticrev`

For the first release, publish manually:

```bash
npm whoami --registry=https://registry.npmjs.org
npm publish --access public
```

`npm publish` automatically repeats the complete release quality gate through `prepublishOnly`.

After the first release, configure npm trusted publishing for `.github/workflows/publish.yml` and use that
workflow for later releases without a long-lived publish token.
