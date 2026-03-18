import { describe, expect, it } from 'vitest'

import { clsx } from '../src/styles/clsx.js'

describe('clsx', () => {
  it('merges strings, arrays and object flags', () => {
    const value = clsx(
      'btn',
      ['btn-primary', ['rounded', false, null]],
      { disabled: false, active: true },
      0,
    )

    expect(value).toBe('btn btn-primary rounded active 0')
  })
})
