# `styles`

Функционал:
- `clsx(...)` / `cx(...)` для сборки className из строк, массивов и словарей

Экспорт:
- `clsx`
- `cx` (alias)
- типы `ClassValue`, `ClassDictionary`

Пример:

```ts
import { clsx } from '@atlanticrev/atl-utils/styles'

const className = clsx(
  'button',
  ['button--primary', null],
  { 'is-loading': true, 'is-disabled': false },
)

// "button button--primary is-loading"
```

Пример с alias:

```ts
import { cx } from '@atlanticrev/atl-utils/styles/clsx'

const cardClass = cx('card', { 'card--elevated': true })
```

План развития (полезно для реальных проектов):
- `variants` (`cva`-style)
- `css-vars`
- `units` (`px/rem/clamp`)
- `colors`
- `media`
