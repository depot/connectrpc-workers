import type {ConnectRouter, ConnectRouterOptions, ContextValues} from '@connectrpc/connect'
import {createConnectRouter} from '@connectrpc/connect'
import type {UniversalHandler, UniversalServerRequest, UniversalServerResponse} from '@connectrpc/connect/protocol'
import {uResponseNotFound} from '@connectrpc/connect/protocol'

// Types **********************************************************************

export interface ConnectWorkersAdapterOptions<Env = unknown, CfHostMetadata = unknown> extends ConnectRouterOptions {
  /**
   * Route definitions. We recommend creating a function that defines all routes:
   *
   * ```ts
   * import {ConnectRouter} from "@connectrpc/connect"
   *
   * function routes(router: ConnectRouter) {
   *   router.service(ElizaService, {})
   * }
   * ```
   *
   * Then pass this function here.
   */
  routes: (router: ConnectRouter) => void

  /**
   * If none of the handler request paths match, a 404 is served. This option
   * can provide a custom fallback for this case.
   */
  fallback?: ExportedHandlerFetchHandler

  /**
   * Serve all handlers under this prefix. For example, the prefix `/something`
   * will serve the RPC `foo.FooService/Bar` under `/something/foo.FooService/Bar`.
   */
  requestPathPrefix?: string

  /**
   * Context values to extract from the request. These values are passed to
   * the handlers.
   */
  contextValues?: (request: Request<CfHostMetadata>, env: Env, ctx: ExecutionContext) => ContextValues
}

// Adapter ********************************************************************

/**
 * Create a Cloudflare Workers fetch handler from a ConnectRouter.
 */
export function connectWorkersAdapter<Env = unknown, CfHostMetadata = unknown>(
  options: ConnectWorkersAdapterOptions<Env, CfHostMetadata>,
): ExportedHandlerFetchHandler<Env, CfHostMetadata> {
  // Create a ConnectRouter and add all routes
  const router = createConnectRouter(options)
  options.routes(router)

  // Create a map of request paths to handlers
  const paths = new Map<string, UniversalHandler>()
  const prefix = options.requestPathPrefix ?? ''
  for (const handler of router.handlers) {
    paths.set(prefix + handler.requestPath, handler)
  }

  // Create a 404 response
  const notFoundResponse = universalResponseToResponse(uResponseNotFound)

  // Return a handler for the routes
  const handler: ExportedHandlerFetchHandler<Env, CfHostMetadata> = async (request, env, context) => {
    const handler = paths.get(new URL(request.url).pathname)
    if (!handler) return options.fallback ? options.fallback(request, env, context) : notFoundResponse

    const contextValues = options.contextValues?.(request, env, context)
    const universalRequest: UniversalServerRequest = requestToUniversalRequest(request, contextValues)
    const universalResponse = await handler(universalRequest)

    return universalResponseToResponse(universalResponse)
  }

  return handler
}

// Utils **********************************************************************

function requestToUniversalRequest(request: Request, contextValues?: ContextValues): UniversalServerRequest {
  const httpVersion = request.cf?.httpProtocol === 'HTTP/2' ? '2.0' : '1.1'
  return {
    httpVersion: httpVersion,
    url: request.url,
    method: request.method,
    header: request.headers,
    body: request.body,
    signal: request.signal,
    contextValues,
  }
}

function universalResponseToResponse(universalResponse: UniversalServerResponse): Response {
  if (universalResponse.trailer) {
    console.warn('Trailers are not supported in the Workers environment, and will be ignored by the Response')
  }
  return new Response(universalResponse.body ? asyncIterableToReadableStream(universalResponse.body) : null, {
    status: universalResponse.status,
    headers: universalResponse.header,
  })
}

function asyncIterableToReadableStream<T>(iterable: AsyncIterable<T>): ReadableStream<T> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of iterable) {
          controller.enqueue(chunk)
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
