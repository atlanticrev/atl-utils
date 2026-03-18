# `errors`

Базовый слой ошибок для всей библиотеки.

Что есть сейчас:
- `AppError`, `AppTypeError`, `AppRangeError`
- фабрики ошибок (`createError`, `createTypeError`, `createSerializationError`, ...)
- `toError(...)` для нормализации `unknown`
- `serializeError(...)` для логирования/транспортировки
- `isErrorLike`, `hasErrorCode`, `createErrorCode`

Важно:
- `HttpClientError` и его наследники теперь тоже строятся поверх общего `AppError`.

## Базовое использование

```ts
import { AppError, createErrorCode } from '@atlanticrev/atl-utils/errors'

const USER_NOT_FOUND = createErrorCode('USER_NOT_FOUND')

throw new AppError('User not found', {
  code: USER_NOT_FOUND,
  context: { scope: 'users' },
})
```

## Фабрики ошибок

```ts
import {
  createRuntimeUnavailableError,
  createSerializationError,
  createTypeError,
} from '@atlanticrev/atl-utils/errors'

throw createRuntimeUnavailableError('localStorage')
throw createSerializationError('Value cannot be serialized to JSON')
throw createTypeError('Expected string')
```

## Нормализация `unknown`

```ts
import { toError } from '@atlanticrev/atl-utils/errors'

try {
  // ...
} catch (error) {
  const normalized = toError(error, {
    fallbackMessage: 'Unexpected failure',
  })

  console.error(normalized.message)
}
```

## Сериализация для логирования

```ts
import { createError, serializeError } from '@atlanticrev/atl-utils/errors'

const rootCause = new Error('DB is offline')
const error = createError('Failed to load user', {
  code: 'LOAD_USER_FAILED',
  cause: rootCause,
  context: { userId: 'u1' },
})

const payload = serializeError(error, {
  includeStack: false,
})
```
