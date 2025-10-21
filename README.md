# nestjs-restcall

Reusable REST client utilities for NestJS applications. `nestjs-restcall` provides an extendible `AbstractRestTemplate` class plus a default `RestTemplateService`, making it simple to wrap upstream HTTP APIs with consistent error handling, auth hooks, and reusable helpers.

- 🔁 Shared request pipeline across verbs (`GET`, `POST`, etc.) with typed overloads
- 🛡️ Centralized error translation via `mapAndThrowError`
- 🔐 Pluggable auth/token handling using `RequestContext`
- 🧰 Helper utilities for query strings and validation

## Installation

```bash
npm install nestjs-restcall
```

If you are using Yarn or pnpm, install via `yarn add nestjs-restcall` or `pnpm add nestjs-restcall`.

## Quick Start

Register the provided module, then inject the ready-to-use `RestTemplateService` anywhere you need to make outbound HTTP calls.

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { RestTemplateModule } from 'nestjs-restcall';

@Module({
  imports: [RestTemplateModule],
})
export class AppModule {}
```

```ts
// Some service or controller
import { Injectable } from '@nestjs/common';
import { RestTemplateService } from 'nestjs-restcall';

@Injectable()
export class PaymentsService {
  constructor(private readonly rest: RestTemplateService) {}

  async fetchPayment(id: string) {
    return this.rest.get<Payment>(`https://payments.internal/api/payments/${id}`);
  }
}
```

### Passing headers, params, and context

```ts
await this.rest.get<Payment[]>('https://payments.internal/api/payments', {
  params: { limit: 50 },
  headers: { 'X-Trace-Id': ctx.traceId },
  context: { token: userToken, requestId: ctx.traceId },
});
```

## Extending the template

Most projects will subclass `AbstractRestTemplate` to customize auth, headers, or error handling.

```ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AbstractRestTemplate,
  RequestContext,
  UpstreamErrorBody,
} from 'nestjs-restcall';

@Injectable()
export class PaymentsRestTemplate extends AbstractRestTemplate {
  protected getDefaultHeaders() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    } as const;
  }

  protected async applyAuth(config, context?: RequestContext) {
    if (!context?.token) return config;
    return {
      ...config,
      headers: {
        ...(config.headers ?? {}),
        Authorization: `Bearer ${context.token}`,
      },
    };
  }

  protected mapAndThrowError(error: unknown): never {
    const upstream = error as { response?: { status?: number; data?: UpstreamErrorBody } };
    const status = upstream.response?.status ?? HttpStatus.BAD_GATEWAY;
    throw new HttpException(
      {
        message: upstream.response?.data?.message ?? 'Upstream request failed',
        code: upstream.response?.data?.code ?? 'UPSTREAM_ERROR',
        details: upstream.response?.data?.details,
      },
      status,
    );
  }
}
```

Provide your subclass via Nest DI as needed (e.g., register it in a feature module, use it instead of the default `RestTemplateService`, or wrap it with domain-specific methods).

## Helpers and types

The package re-exports utility helpers and types to keep integrations strongly typed:

- `buildUrl(url, params)` – append primitive query params
- `assertNonEmpty(value, label)` – guard string arguments
- `RequestContext` and `RestRequestOption` interfaces – consistent context typing
- `TokenProvider` interface – handshake around caching and refreshing auth tokens

Import them directly from the package root:

```ts
import { buildUrl, RequestContext, TokenProvider } from 'nestjs-restcall';
```

## Development

Local scripts assume Node.js 18+:

```bash
# Install deps
npm install

# Check formatting & lint
npm run lint

# Run tests
npm run test

# Compile to dist/
npm run build
```

The `test` script disables Watchman to stay CI-friendly. Unit coverage lives in `src/rest-template/services/rest-template.service.spec.ts`; expand the suite as you add features.

## CI & Publishing

- `.github/workflows/test.yml` runs linting and tests on every pull request and pushes to `main`/`master`.
- `.github/workflows/publish.yml` executes lint, tests, build, and `npm publish` when a release is published or a version tag is pushed. Configure the `NPM_TOKEN` secret in your repository settings before triggering a publish.

## License

MIT © 2025 rest-call contributors
