# `date-and-time`

Функционал:
- `formatDate(...)` — обертка над `Intl.DateTimeFormat`

Экспорт:
- `formatDate`
- типы `FormatDateInput`, `FormatDateOptions`

Поддерживаемый input:
- `Date`
- `number` (timestamp)
- `string`

Пример:

```ts
import { formatDate } from '@atlanticrev/atl-utils/date-and-time'

const label = formatDate('2026-02-26T12:30:00Z', {
  locale: 'ru-RU',
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Moscow',
})
```

Пример короткого формата:

```ts
import { formatDate } from '@atlanticrev/atl-utils/date-and-time/format-date'

const short = formatDate(Date.now(), {
  locale: 'en-US',
  month: 'short',
  day: '2-digit',
})
```

Важно:
- `formatDate` бросает `TypeError`, если передана невалидная дата.
