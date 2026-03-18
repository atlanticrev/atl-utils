import { HttpResponseError } from '../errors.js'
import {
  type HttpMiddlewareRegistry,
  applyErrorMiddlewares,
  applyRequestMiddlewares,
  applyResponseMiddlewares,
} from '../middleware.js'
import { calculateRetryDelayMs, shouldRetryRequest } from '../retry.js'
import type {
  HttpClientDefaults,
  HttpClientResponse,
  HttpMiddlewareContext,
  HttpRequestConfig,
  HttpRetryDecisionContext,
  ResolvedHttpRequestConfig,
} from '../types.js'
import { createAbortComposition, delayWithAbort } from './abort.js'
import { resolveAdapter, toAdapterRequest } from './adapters.js'
import { ensureAbortError, normalizeUnknownError } from './error-normalization.js'
import { cloneRequestConfig, mergeRequestConfig, prepareRequestConfig } from './request-config.js'
import { nextRequestId } from './request-id.js'
import { parseErrorResponseData, parseResponseData } from './response-parsing.js'
import { cancelResponseBody, cloneResponseSafely, createResponseObject } from './response-utils.js'
import { validateRequestSchemas, validateResponseDataSchema } from './schema-validation.js'
import type { HttpClientAdapters } from './types.js'

type ExecuteRequestOptions = {
  requestConfig: HttpRequestConfig
  defaults: HttpClientDefaults
  middlewareRegistry: HttpMiddlewareRegistry
  adapters: HttpClientAdapters
}

export const executeRequest = async <T>(
  options: ExecuteRequestOptions,
): Promise<HttpClientResponse<T>> => {
  const requestId = nextRequestId()
  const startedAtMs = Date.now()
  const globalMiddlewares = options.middlewareRegistry.list()
  const mergedConfig = mergeRequestConfig(options.defaults, options.requestConfig)
  const middlewares = [...globalMiddlewares, ...(options.requestConfig.middlewares ?? [])]
  let lastResolvedConfig: ResolvedHttpRequestConfig | undefined
  for (let attempt = 1; ; attempt += 1) {
    const middlewareContext: HttpMiddlewareContext = {
      requestId,
      attempt,
      startedAtMs,
    }
    let resolvedConfig: ResolvedHttpRequestConfig | undefined
    let abortComposition: ReturnType<typeof createAbortComposition> | undefined
    try {
      const middlewareInput = cloneRequestConfig(mergedConfig)
      const middlewareOutput = await applyRequestMiddlewares(
        middlewareInput,
        middlewares,
        middlewareContext,
      )
      const validatedRequestConfig = await validateRequestSchemas(middlewareOutput, requestId)
      resolvedConfig = prepareRequestConfig(validatedRequestConfig)
      lastResolvedConfig = resolvedConfig
      const adapter = resolveAdapter(resolvedConfig, options.adapters)
      abortComposition = createAbortComposition(resolvedConfig.signal, resolvedConfig.timeoutMs)
      const adapterResult = await adapter(toAdapterRequest(resolvedConfig, abortComposition.signal))
      const response = await applyResponseMiddlewares(adapterResult.response, middlewares, {
        ...middlewareContext,
        config: resolvedConfig,
      })
      const isValidStatus = resolvedConfig.validateStatus(response.status)
      const retryContextFromResponse: HttpRetryDecisionContext = {
        attempt,
        config: resolvedConfig,
        response,
      }
      if (
        !isValidStatus &&
        (await shouldRetryRequest(retryContextFromResponse, resolvedConfig.retry))
      ) {
        const delayMs = calculateRetryDelayMs(resolvedConfig.retry, attempt, response)
        await cancelResponseBody(response)
        if (resolvedConfig.retry.onRetry) {
          await resolvedConfig.retry.onRetry({
            ...retryContextFromResponse,
            delayMs,
          })
        }
        abortComposition.cleanup()
        await delayWithAbort(delayMs, resolvedConfig.signal)
        continue
      }
      if (!isValidStatus && resolvedConfig.throwOnHttpError) {
        const errorClone = cloneResponseSafely(response)
        const parsedErrorData = errorClone
          ? await parseErrorResponseData(errorClone, resolvedConfig, requestId)
          : undefined
        const errorData = errorClone
          ? await validateResponseDataSchema(parsedErrorData, response, resolvedConfig, requestId)
          : parsedErrorData
        const result = createResponseObject({
          data: errorData,
          response,
          responseUrl: adapterResult.url || response.url || resolvedConfig.requestUrl,
          requestId,
          attempt,
          startedAtMs,
          config: resolvedConfig,
        })
        throw new HttpResponseError(
          `${resolvedConfig.method} ${resolvedConfig.requestUrl} failed with status ${response.status}`,
          response,
          errorData,
          {
            config: resolvedConfig,
            requestId,
            result,
          },
        )
      }
      const parsedData = await parseResponseData<T>(
        response,
        resolvedConfig.responseType,
        resolvedConfig,
        requestId,
      )
      const data = await validateResponseDataSchema(parsedData, response, resolvedConfig, requestId)
      abortComposition.cleanup()
      return createResponseObject({
        data,
        response,
        responseUrl: adapterResult.url || response.url || resolvedConfig.requestUrl,
        requestId,
        attempt,
        startedAtMs,
        config: resolvedConfig,
      })
    } catch (error) {
      const didTimeout = abortComposition?.didTimeout() ?? false
      const normalizedError =
        abortComposition?.wasAborted() && !didTimeout
          ? ensureAbortError(error, resolvedConfig, requestId)
          : normalizeUnknownError(error, {
              config: resolvedConfig,
              requestId,
              timeoutMs: resolvedConfig?.timeoutMs,
              didTimeout,
            })
      if (abortComposition) {
        abortComposition.cleanup()
      }
      if (
        resolvedConfig &&
        (await shouldRetryRequest(
          {
            attempt,
            config: resolvedConfig,
            error: normalizedError,
          },
          resolvedConfig.retry,
        ))
      ) {
        const delayMs = calculateRetryDelayMs(resolvedConfig.retry, attempt)
        if (resolvedConfig.retry.onRetry) {
          await resolvedConfig.retry.onRetry({
            attempt,
            config: resolvedConfig,
            error: normalizedError,
            delayMs,
          })
        }
        await delayWithAbort(delayMs, resolvedConfig.signal)
        continue
      }
      const finalError = await applyErrorMiddlewares(normalizedError, middlewares, {
        requestId,
        attempt,
        startedAtMs,
        config: resolvedConfig ?? lastResolvedConfig,
      })

      throw finalError
    }
  }
}
