import { createTypeError } from '../errors/index.js'

export type FormatDateInput = Date | number | string

export type FormatDateOptions = Intl.DateTimeFormatOptions & {
  locale?: string | string[]
}

export function formatDate(value: FormatDateInput, options: FormatDateOptions = {}): string {
  const { locale, ...intlOptions } = options

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw createTypeError('Invalid date value', {
      code: 'INVALID_DATE_VALUE',
      context: {
        value,
      },
    })
  }

  return new Intl.DateTimeFormat(locale, intlOptions).format(date)
}
