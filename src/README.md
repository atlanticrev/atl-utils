# `src` Module Map

Это внутренняя карта модулей библиотеки утилит.

Текущие рабочие модули:
- `errors` — базовый слой ошибок, нормализация и сериализация
- `async` — async primitives (`sleep`, `withTimeout`, `debounce`, `throttle`, limiter)
- `cache` — in-memory cache, TTL/LRU, in-flight dedupe, key serializer
- `styles` — утилиты для className / будущих style helpers
- `date-and-time` — утилиты даты/времени
- `storages` — browser storage adapters (cookie, local/session, Cache Storage, IndexedDB)
- `http` — adapter-based HTTP client (`fetch` + `xhr`)

Рекомендация по импортам:
- Для максимального tree-shaking используй leaf imports:
  `@atlanticrev/atl-utils/http`, `@atlanticrev/atl-utils/storages/cookie`
- Category imports тоже допустимы:
  `@atlanticrev/atl-utils/storages`, `@atlanticrev/atl-utils/styles`

Важно:
- В примерах ниже используется реальный пакет `@atlanticrev/atl-utils`.
