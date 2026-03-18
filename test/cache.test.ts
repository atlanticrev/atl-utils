import { describe, expect, it } from 'vitest'

import {
  createInFlightDedupe,
  createMemoryCache,
  joinCacheKey,
  stableSerializeCacheKey,
} from '../src/index.js'

describe('cache module', () => {
  it('stores and retrieves values from memory cache', () => {
    const cache = createMemoryCache<string, number>()

    cache.set('a', 1)

    expect(cache.get('a')).toBe(1)
    expect(cache.has('a')).toBe(true)
    expect(cache.entries()).toEqual([['a', 1]])
  })

  it('expires entries using ttl and injected clock', () => {
    let nowMs = 1_000
    const cache = createMemoryCache<string, string>({
      ttlMs: 100,
      now: () => nowMs,
    })

    cache.set('token', 'v1')
    expect(cache.get('token')).toBe('v1')

    nowMs += 101
    expect(cache.get('token')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  it('evicts least recently used entry when maxSize is reached', () => {
    const cache = createMemoryCache<string, number>({ maxSize: 2 })

    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1) // touch a, so b becomes LRU
    cache.set('c', 3)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
  })

  it('deduplicates in-flight async tasks by key', async () => {
    const dedupe = createInFlightDedupe()
    let calls = 0

    const task = () =>
      dedupe.run('user:1', async () => {
        calls += 1
        return { id: '1' }
      })

    const [a, b] = await Promise.all([task(), task()])

    expect(a).toEqual({ id: '1' })
    expect(b).toEqual({ id: '1' })
    expect(calls).toBe(1)
    expect(dedupe.size).toBe(0)
  })

  it('serializes cache keys deterministically', () => {
    const keyA = stableSerializeCacheKey({ b: 2, a: 1 })
    const keyB = stableSerializeCacheKey({ a: 1, b: 2 })

    expect(keyA).toBe(keyB)
    expect(joinCacheKey(['users', { page: 1 }])).toContain('str:"users"')
  })

  it('throws on circular cache key structures', () => {
    const value: Record<string, unknown> = {}
    value.self = value

    expect(() => stableSerializeCacheKey(value)).toThrow(TypeError)
  })
})
