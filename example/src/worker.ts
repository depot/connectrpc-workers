import type {ExportedHandler} from '@cloudflare/workers-types'
import type {ConnectRouter, ServiceImpl} from '@connectrpc/connect'
import {connectWorkersAdapter} from '../..'
import {ExampleService} from './proto/example/v1/example_connect'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function routes(router: ConnectRouter) {
  router.service(ExampleService, impl)
}

const impl: ServiceImpl<typeof ExampleService> = {
  async helloUnary(request) {
    return {greeting: `Hello, ${request.name}!`}
  },

  async helloClientStream(requests) {
    const names: string[] = []
    for await (const request of requests) {
      names.push(request.name)
    }
    return {greeting: `Hello ${names.join(', ')}!`}
  },

  async *helloServerStream(request) {
    yield {greeting: `Hello again, ${request.name}!`}
    await sleep(1000)
    yield {greeting: `Hello again, again, ${request.name}!`}
    await sleep(1000)
    yield {greeting: `Goodbye, ${request.name}!`}
  },

  async *helloBiDiStream(requests) {
    for await (const request of requests) {
      yield {greeting: `Hello, ${request.name}!`}
      await sleep(1000)
      yield {greeting: `Goodbye, ${request.name}!`}
      await sleep(2000)
    }
  },
}

const handler = connectWorkersAdapter({routes})

export default {
  fetch(request, env, context) {
    return handler(request, env, context)
  },
} satisfies ExportedHandler
