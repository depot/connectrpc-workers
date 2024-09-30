/// <reference types="node" />

import {createPromiseClient} from '@connectrpc/connect'
import {createConnectTransport} from '@connectrpc/connect-node'
import {ExampleService} from './proto/example/v1/example_connect'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8787'
const httpVersion = BASE_URL.startsWith('https') ? '2' : '1.1'

const transport = createConnectTransport({
  httpVersion: httpVersion,
  baseUrl: BASE_URL,
})

const client = createPromiseClient(ExampleService, transport)

async function main() {
  console.log(`Connecting to ${BASE_URL} (HTTP/${httpVersion})`)

  header('Unary')
  const unaryResponse = await client.helloUnary({name: 'world'})
  console.log(unaryResponse)

  header('Client stream')
  const clientStreamResponse = await client.helloClientStream(produceNames())
  console.log(clientStreamResponse)

  header('Server stream')
  const serverStream = client.helloServerStream({name: 'world'})
  for await (const message of serverStream) {
    console.log(message)
  }

  header('BiDi stream')
  if (httpVersion === '2') {
    const bidiStream = client.helloBiDiStream(produceNames())
    for await (const message of bidiStream) {
      console.log(message)
    }
  } else {
    console.log('Skipping, BiDi streaming is not supported with HTTP/1.1')
  }
}

async function* produceNames() {
  yield {name: 'Alice'}
  yield {name: 'Bob'}
  yield {name: 'Charlie'}
  yield {name: 'Dave'}
  yield {name: 'Eve'}
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

function header(name: string) {
  console.log(`\n${name}\n${'='.repeat(name.length)}`)
}
