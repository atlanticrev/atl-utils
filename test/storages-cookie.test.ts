import { describe, expect, it } from 'vitest'

import { parseCookieString, serializeCookie } from '../src/storages/cookie.js'

describe('cookie storage helpers', () => {
  it('parses cookie string with URL-encoded values', () => {
    const cookies = parseCookieString('theme=dark; user=John%20Doe; empty=')

    expect(cookies).toEqual({
      empty: '',
      theme: 'dark',
      user: 'John Doe',
    })
  })

  it('serializes cookie with attributes', () => {
    const value = serializeCookie('token', 'abc', {
      path: '/',
      maxAge: 60,
      sameSite: 'Lax',
      secure: true,
    })

    expect(value).toContain('token=abc')
    expect(value).toContain('Path=/')
    expect(value).toContain('Max-Age=60')
    expect(value).toContain('SameSite=Lax')
    expect(value).toContain('Secure')
  })
})
