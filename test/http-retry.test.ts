import { describe, expect, it, vi } from 'vitest'

import {
  HttpAbortError,
  type ResolvedHttpRequestConfig,
  calculateRetryDelayMs,
  normalizeRetryOptions,
  shouldRetryRequest,
} from '../src/http/index.js'

function createResolvedConfig(
  overrides: Partial<ResolvedHttpRequestConfig> = {},
): ResolvedHttpRequestConfig {
  return {
    url: '/resource',
    requestUrl: 'https://example.test/resource',
    method: 'GET',
    headers: new Headers(),
    body: null,
    bodyType: 'raw',
    responseType: 'auto',
    errorResponseType: 'auto',
    retry: normalizeRetryOptions(false),
    validateStatus: (status) => status >= 200 && status < 300,
    throwOnHttpError: true,
    adapter: 'fetch',
    ...overrides,
  } as ResolvedHttpRequestConfig
}

describe('http retry helpers', () => {
  it('normalizes retry options for false and numeric values', () => {
    const disabled = normalizeRetryOptions(false)
    const numeric = normalizeRetryOptions(3)

    expect(disabled.retries).toBe(0)
    expect(numeric.retries).toBe(3)
    expect(numeric.retryMethods).toContain('GET')
  })

  it('calculates clamped delay and respects Retry-After seconds', () => {
    const options = normalizeRetryOptions({
      retries: 3,
      baseDelayMs: 100,
      maxDelayMs: 250,
      backoffFactor: 3,
      jitter: 'none',
    })

    expect(calculateRetryDelayMs(options, 3)).toBe(250)

    const response = new Response(null, {
      status: 503,
      headers: {
        'retry-after': '2',
      },
    })

    expect(calculateRetryDelayMs(options, 1, response)).toBe(250)
  })

  it('retries only allowed methods for retriable statuses by default', async () => {
    const options = normalizeRetryOptions(1)
    const response = new Response(null, { status: 503 })

    const getDecision = await shouldRetryRequest(
      {
        attempt: 1,
        config: createResolvedConfig({ method: 'GET' }),
        response,
      },
      options,
    )

    const postDecision = await shouldRetryRequest(
      {
        attempt: 1,
        config: createResolvedConfig({ method: 'POST' }),
        response,
      },
      options,
    )

    expect(getDecision).toBe(true)
    expect(postDecision).toBe(false)
  })

  it('does not retry abort errors', async () => {
    const options = normalizeRetryOptions(2)

    const decision = await shouldRetryRequest(
      {
        attempt: 1,
        config: createResolvedConfig({ method: 'GET' }),
        error: new HttpAbortError(),
      },
      options,
    )

    expect(decision).toBe(false)
  })

  it('uses custom shouldRetry override instead of default retry decision', async () => {
    const options = normalizeRetryOptions({
      retries: 2,
      shouldRetry(context) {
        return context.response?.status === 418
      },
    })

    const retry503 = await shouldRetryRequest(
      {
        attempt: 1,
        config: createResolvedConfig({ method: 'GET' }),
        response: new Response(null, { status: 503 }),
      },
      options,
    )

    const retry418 = await shouldRetryRequest(
      {
        attempt: 1,
        config: createResolvedConfig({ method: 'GET' }),
        response: new Response(null, { status: 418 }),
      },
      options,
    )

    expect(retry503).toBe(false)
    expect(retry418).toBe(true)
  })

  it('parses Retry-After HTTP-date values', () => {
    const nowMs = Date.UTC(2026, 0, 1, 0, 0, 0)
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(nowMs)

    try {
      const options = normalizeRetryOptions({
        retries: 2,
        baseDelayMs: 100,
        maxDelayMs: 10_000,
        jitter: 'none',
      })

      const response = new Response(null, {
        status: 503,
        headers: {
          'retry-after': new Date(nowMs + 4_000).toUTCString(),
        },
      })

      expect(calculateRetryDelayMs(options, 1, response)).toBe(4_000)
    } finally {
      dateNowSpy.mockRestore()
    }
  })
})
