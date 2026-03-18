export type CookieSameSite = 'Strict' | 'Lax' | 'None'

export type CookieAttributes = {
  path?: string
  domain?: string
  expires?: Date | string | number
  maxAge?: number
  secure?: boolean
  sameSite?: CookieSameSite
  partitioned?: boolean
}

export type CookieStorageOptions = {
  prefix?: string
  defaultAttributes?: CookieAttributes
  encode?: (value: string) => string
  decode?: (value: string) => string
}

export type CookieStorage = {
  readonly prefix: string
  raw(): string
  get(key: string): string | null
  getJson<T>(key: string): T | null
  set(key: string, value: string, attributes?: CookieAttributes): void
  setJson(key: string, value: unknown, attributes?: CookieAttributes): void
  remove(key: string, attributes?: CookieAttributes): void
  has(key: string): boolean
  keys(): string[]
  entries(): Array<[string, string]>
  clear(attributes?: CookieAttributes): void
}
