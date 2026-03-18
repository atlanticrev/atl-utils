import { describe, expect, it } from 'vitest'

import { formatDate } from '../src/date-and-time/format-date.js'

describe('formatDate', () => {
  it('formats a date with explicit locale and timezone', () => {
    const value = formatDate('2024-01-02T03:04:05.000Z', {
      locale: 'en-GB',
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    expect(value).toBe('02/01/2024')
  })

  it('throws on invalid input', () => {
    expect(() => formatDate('not-a-date')).toThrow(TypeError)
  })
})
