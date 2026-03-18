import type {
  HttpErrorMiddleware,
  HttpMiddleware,
  HttpMiddlewareContext,
  HttpRequestConfig,
  HttpResponseMiddleware,
  ResolvedHttpRequestConfig,
} from './types.js'

export class HttpMiddlewareRegistry {
  private readonly middlewares: HttpMiddleware[] = []

  use(middleware: HttpMiddleware): () => void {
    this.middlewares.push(middleware)

    return () => {
      const index = this.middlewares.indexOf(middleware)
      if (index >= 0) {
        this.middlewares.splice(index, 1)
      }
    }
  }

  list(): HttpMiddleware[] {
    return [...this.middlewares]
  }
}

export async function applyRequestMiddlewares(
  config: HttpRequestConfig,
  middlewares: HttpMiddleware[],
  context: HttpMiddlewareContext,
): Promise<HttpRequestConfig> {
  let nextConfig = config

  for (const middleware of middlewares) {
    const onRequest = middleware.onRequest
    if (!onRequest) {
      continue
    }

    const result = await onRequest(nextConfig, context)
    if (result) {
      nextConfig = result
    }
  }

  return nextConfig
}

export async function applyResponseMiddlewares(
  response: Response,
  middlewares: HttpMiddleware[],
  context: HttpMiddlewareContext & { config: ResolvedHttpRequestConfig },
): Promise<Response> {
  let nextResponse = response

  for (const middleware of middlewares) {
    const onResponse: HttpResponseMiddleware | undefined = middleware.onResponse
    if (!onResponse) {
      continue
    }

    const result = await onResponse(nextResponse, context)
    if (result) {
      nextResponse = result
    }
  }

  return nextResponse
}

export async function applyErrorMiddlewares(
  error: unknown,
  middlewares: HttpMiddleware[],
  context: HttpMiddlewareContext & { config?: ResolvedHttpRequestConfig | undefined },
): Promise<unknown> {
  let nextError = error

  for (const middleware of middlewares) {
    const onError: HttpErrorMiddleware | undefined = middleware.onError
    if (!onError) {
      continue
    }

    try {
      const result = await onError(nextError, context)
      if (result instanceof Error) {
        nextError = result
      }
    } catch (thrown) {
      nextError = thrown
    }
  }

  return nextError
}
