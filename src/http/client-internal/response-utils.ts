import type { HttpClientResponse, ResolvedHttpRequestConfig } from '../types.js'

type CreateResponseObjectOptions<T> = {
  data: T
  response: Response
  responseUrl: string
  requestId: string
  attempt: number
  startedAtMs: number
  config: ResolvedHttpRequestConfig
}

export const createResponseObject = <T>(
  options: CreateResponseObjectOptions<T>,
): HttpClientResponse<T> => {
  return {
    data: options.data,
    status: options.response.status,
    statusText: options.response.statusText,
    ok: options.response.ok,
    headers: options.response.headers,
    url: options.responseUrl,
    raw: options.response,
    requestId: options.requestId,
    attempt: options.attempt,
    durationMs: Date.now() - options.startedAtMs,
    config: options.config,
  }
}

export const cloneResponseSafely = (response: Response): Response | null => {
  try {
    return response.clone()
  } catch {
    return null
  }
}

export const cancelResponseBody = async (response: Response): Promise<void> => {
  try {
    await response.body?.cancel()
  } catch {
    // Ignore body cancel failures.
  }
}
