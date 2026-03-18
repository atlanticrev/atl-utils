export const hasHeader = (headers: Headers, name: string): boolean => {
  return headers.has(name)
}

export const setHeaderIfMissing = (headers: Headers, name: string, value: string): void => {
  if (!headers.has(name)) {
    headers.set(name, value)
  }
}

export const mergeHeaders = (...sources: Array<HeadersInit | undefined>): Headers => {
  const headers = new Headers()

  for (const source of sources) {
    if (!source) {
      continue
    }

    const sourceHeaders = source instanceof Headers ? source : new Headers(source)
    sourceHeaders.forEach((value, key) => {
      headers.set(key, value)
    })
  }

  return headers
}
