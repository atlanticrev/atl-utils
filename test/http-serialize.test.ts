import { describe, expect, it } from 'vitest'

import { buildUrl, serializeHttpBody } from '../src/http/serialize.js'

describe('http serialize helpers', () => {
  it('builds URLs with baseUrl and nested params', () => {
    const url = buildUrl('/users', {
      baseUrl: 'https://api.example.com/v1/',
      params: {
        page: 2,
        tags: ['a', 'b'],
        filter: {
          active: true,
        },
      },
    })

    expect(url).toContain('https://api.example.com/users?')
    expect(url).toContain('page=2')
    expect(url).toContain('tags=a')
    expect(url).toContain('tags=b')
    expect(url).toContain('filter%5Bactive%5D=true')
  })

  it('serializes json and urlencoded bodies with headers', () => {
    const json = serializeHttpBody({
      headers: new Headers(),
      data: { a: 1 },
      bodyType: 'json',
    })

    expect(json.body).toBe('{"a":1}')
    expect(json.headers.get('content-type')).toBe('application/json')

    const urlencoded = serializeHttpBody({
      headers: new Headers(),
      data: { q: 'hello', tags: ['x', 'y'] },
      bodyType: 'url-encoded',
    })

    expect(urlencoded.headers.get('content-type')).toContain('application/x-www-form-urlencoded')
    expect(String(urlencoded.body)).toContain('q=hello')
    expect(String(urlencoded.body)).toContain('tags=x')
  })

  it('appends params to URLs with existing query strings', () => {
    const url = buildUrl('https://example.test/search?q=base', {
      params: {
        page: 2,
      },
    })

    expect(url).toBe('https://example.test/search?q=base&page=2')
  })

  it('throws when both data and body are provided', () => {
    expect(() =>
      serializeHttpBody({
        headers: new Headers(),
        data: { a: 1 },
        body: 'raw',
      }),
    ).toThrow(TypeError)
  })

  it('serializes form-data from plain objects', () => {
    const result = serializeHttpBody({
      headers: new Headers(),
      data: {
        name: 'Alex',
        tags: ['a', 'b'],
      },
      bodyType: 'form-data',
    })

    const formData = result.body as FormData

    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('name')).toBe('Alex')
    expect(formData.getAll('tags[]')).toEqual(['a', 'b'])
  })

  it('validates raw body type and preserves explicit content-type for json', () => {
    expect(() =>
      serializeHttpBody({
        headers: new Headers(),
        data: { a: 1 },
        bodyType: 'raw',
      }),
    ).toThrow(TypeError)

    const json = serializeHttpBody({
      headers: new Headers({
        'content-type': 'application/vnd.api+json',
      }),
      data: { a: 1 },
      bodyType: 'json',
    })

    expect(json.headers.get('content-type')).toBe('application/vnd.api+json')
  })
})
