# `@depot/connectrpc-workers`

[![CI](https://github.com/depot/connectrpc-workers/actions/workflows/ci.yml/badge.svg)](https://github.com/depot/connectrpc-workers/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/connectrpc-workers.svg)](https://www.npmjs.com/package/connectrpc-workers)
![Powered by TypeScript](https://img.shields.io/badge/powered%20by-typescript-blue.svg)

A [Connect RPC](https://connectrpc.com/) adapter for [Cloudflare Workers](https://workers.cloudflare.com/).

## Installation

You can install the module with your favorite package manager:

```bash
pnpm add @depot/connectrpc-workers
```

This package depends on the peer dependencies `@connectrpc/connect` and `@cloudflare/workers-types`.

## Usage

You can construct a function to register handlers for your Connect services, then construct a Cloudflare Workers fetch event handler from those routes:

```typescript
import type {ConnectRouter} from '@connectrpc/connect'
import {connectWorkersAdapter} from '@depot/connectrpc-workers'

function routes(router: ConnectRouter) {
  // implement rpc Say(SayRequest) returns (SayResponse)
  router.rpc(ElizaService, ElizaService.methods.say, async (req) => ({
    sentence: `you said: ${req.sentence}`,
  }))
}

const handler = connectWorkersAdapter({routes})

export default {
  fetch(request, env, context) {
    return handler(request, env, context)
  },
} satisfies ExportedHandler
```

## License

MIT License, see `LICENSE`.
