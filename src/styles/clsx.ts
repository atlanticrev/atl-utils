export type ClassDictionary = {
  [className: string]: unknown
}

export type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ClassDictionary
  | ClassValue[]

function pushClassValue(value: ClassValue, tokens: string[]): void {
  if (value == null || value === false) {
    return
  }

  if (typeof value === 'string') {
    if (value.length > 0) {
      tokens.push(value)
    }
    return
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    tokens.push(String(value))
    return
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      pushClassValue(entry, tokens)
    }
    return
  }

  if (typeof value === 'object') {
    for (const [className, enabled] of Object.entries(value)) {
      if (enabled) {
        tokens.push(className)
      }
    }
  }
}

export function clsx(...values: ClassValue[]): string {
  const tokens: string[] = []

  for (const value of values) {
    pushClassValue(value, tokens)
  }

  return tokens.join(' ')
}

export const cx = clsx
