import { describe, expect, it } from 'vitest'

import { createWebStorageStore } from '../src/storages/web-storage.js'

class MemoryStorage {
  private readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}

describe('createWebStorageStore', () => {
  it('supports scoped CRUD operations', () => {
    const storage = new MemoryStorage()
    storage.setItem('other:key', 'keep')

    const store = createWebStorageStore(() => storage as unknown as Storage, {
      kind: 'memory',
      prefix: 'app',
    })

    store.set('theme', 'dark')
    store.setJson('profile', { name: 'Alex' })

    expect(store.get('theme')).toBe('dark')
    expect(store.getJson<{ name: string }>('profile')).toEqual({ name: 'Alex' })
    expect(store.has('theme')).toBe(true)
    expect(store.keys().sort()).toEqual(['profile', 'theme'])
    expect(store.entries()).toContainEqual(['theme', 'dark'])

    store.remove('theme')
    expect(store.get('theme')).toBeNull()

    store.clear()
    expect(storage.getItem('other:key')).toBe('keep')
    expect(store.keys()).toEqual([])
  })
})
