import {
  Method,
  AxiosResponse,
  AxiosRequestConfig,
  RawAxiosRequestHeaders,
  AxiosError,
} from 'axios';
import { HttpService } from '@nestjs/axios';

export enum ResponseMode {
  data = 'data',
  full = 'full',
}

export interface RequestContext {
  token?: string;
  scopes?: readonly string[];
  requestId?: string;
  [k: string]: unknown;
}

export interface RestRequestOption<
  Q extends Record<string, unknown> = Record<string, unknown>,
> {
  params?: Q;
  headers?: RawAxiosRequestHeaders;
  timeoutMs?: number;
  context?: RequestContext;
}

export interface UpstreamErrorBody {
  message?: string;
  code?: string | number;
  details?: unknown;
}

export abstract class AbstractRestTemplate {
  /**
   * Provide static/default headers for every request.
   * Keep this minimal (e.g., "Accept", "Content-Type").
   * @returns immutable header object; will be merged with per-call headers.
   */
  protected abstract getDefaultHeaders(): Readonly<RawAxiosRequestHeaders>;

  /**
   * Hook to attach authentication (and optionally tracing) to the request.
   * For OAuth: look up/refresh a token, then set `Authorization`.
   * @param config Partially-built Axios config (no method/url/data yet).
   * @param context Optional per-call context (token, scopes, requestId, etc.).
   * @returns Updated config; may be async if token refresh is needed.
   */
  protected abstract applyAuth(
    config: AxiosRequestConfig,
    context?: RequestContext,
  ): Promise<AxiosRequestConfig> | AxiosRequestConfig;

  /**
   * Centralized error translation. Must throw.
   * Inspect transport/library errors and convert to your app's error type
   * (e.g., Nest's HttpException). Keep all throws in one place.
   * @param error Error caught during the HTTP call.
   * @throws never (function must throw)
   */
  protected abstract mapAndThrowError(error: unknown): never;

  constructor(protected readonly http: HttpService) {}

  /**
   * GET: return full AxiosResponse<T> (headers/status/data).
   * Use when you need rate-limit headers, pagination counts, status codes, etc.
   */
  async get<T, Q extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode.full },
  ): Promise<AxiosResponse<T>>;

  /**
   * GET: return only the JSON body (T). Default mode for most calls.
   */
  async get<
    T = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(url: string, options?: RestRequestOption<Q>): Promise<T>;

  /** @internal Single runtime implementation for both overloads. */
  async get<
    T = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<T | AxiosResponse<T>> {
    return this.request<T, Q>('GET', url, undefined, options);
  }

  /** POST: return full AxiosResponse<T>. */
  async post<
    T,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    body?: B,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<AxiosResponse<T>>;

  /** POST: return only the JSON body (T). */
  async post<
    T = unknown,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(url: string, body?: B, options?: RestRequestOption<Q>): Promise<T>;

  /** @internal Single runtime implementation for both overloads. */
  async post<
    T = unknown,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    body?: B,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<T | AxiosResponse<T>> {
    return this.request<T, Q>('POST', url, body, options);
  }

  /** PUT: return full AxiosResponse<T>. */
  async put<
    T,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    body?: B,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<AxiosResponse<T>>;

  /** PUT: return only the JSON body (T). */
  async put<
    T = unknown,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(url: string, body?: B, options?: RestRequestOption<Q>): Promise<T>;

  /** @internal Single runtime implementation for both overloads. */
  async put<
    T = unknown,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    body?: B,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<T | AxiosResponse<T>> {
    return this.request<T, Q>('PUT', url, body, options);
  }

  /** PATCH: return full AxiosResponse<T>. */
  async patch<
    T,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    body?: B,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<AxiosResponse<T>>;

  /** PATCH: return only the JSON body (T). */
  async patch<
    T = unknown,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(url: string, body?: B, options?: RestRequestOption<Q>): Promise<T>;

  /** @internal Single runtime implementation for both overloads. */
  async patch<
    T = unknown,
    B = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    body?: B,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<T | AxiosResponse<T>> {
    return this.request<T, Q>('PATCH', url, body, options);
  }

  /** DELETE: return full AxiosResponse<T>. */
  async delete<T, Q extends Record<string, unknown> = Record<string, unknown>>(
    url: string,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<AxiosResponse<T>>;

  /** DELETE: return only the JSON body (T). */
  async delete<
    T = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(url: string, options?: RestRequestOption<Q>): Promise<T>;

  /** @internal Single runtime implementation for both overloads. */
  async delete<
    T = unknown,
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(
    url: string,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
  ): Promise<T | AxiosResponse<T>> {
    return this.request<T, Q>('DELETE', url, undefined, options);
  }

  /**
   * The function `request` in TypeScript is a protected asynchronous method that sends HTTP requests
   * with optional authentication and retry logic.
   *
   * @param {Method} method - The `method` parameter in the `request` function specifies the HTTP
   * method to be used for the request, such as 'GET', 'POST', 'PUT', 'DELETE', etc.
   * @param {string} url - The `url` parameter in the `request` function is a string that represents
   * the URL to which the HTTP request will be sent. It specifies the endpoint or resource on the
   * server that the client wants to interact with.
   * @param {B} [body] - The `body` parameter in the `request` function represents the data that you
   * want to send in the request. It is optional, meaning you can make requests without a body if not
   * needed. The type of data that can be passed as the body is determined by the generic type `B`
   * specified
   * @param [options] - The `options` parameter in the `request` function is an object that can contain
   * additional configuration options for the HTTP request. It is defined as a generic type
   * `RestRequestOption<Q>` with an additional property `responseMode` of type `ResponseMode`.
   * @param [maxRetryAttempts=0] - The `maxRetryAttempts` parameter in the `request` function specifies
   * the maximum number of retry attempts that can be made if a 401 status code is received in the
   * response. If the initial request results in a 401 status code and `maxRetryAttempts` is greater
   * than 0, the
   * @returns The `request` function returns a `Promise` that resolves to either type `T` or
   * `AxiosResponse<T>`.
   */
  protected async request<
    T,
    Q extends Record<string, unknown> = Record<string, unknown>,
    B = unknown,
  >(
    method: Method,
    url: string,
    body?: B,
    options?: RestRequestOption<Q> & { responseMode: ResponseMode },
    maxRetryAttempts = 0,
  ): Promise<T | AxiosResponse<T>> {
    try {
      const baseCfg = this.buildBaseConfig(options);
      const withAuth = await this.applyAuth(baseCfg, options?.context);
      const finalCfg: AxiosRequestConfig = {
        ...withAuth,
        method,
        url,
        data: body,
      };

      const resp = await this.http.axiosRef.request<T, AxiosResponse<T>>(
        finalCfg,
      );
      return (options?.responseMode ?? ResponseMode.data) === ResponseMode.full
        ? resp
        : resp.data;
    } catch (error) {
      const ax = error as AxiosError;
      const status = ax.response?.status;
      if (status === 401 && maxRetryAttempts > 0) {
        return await this.request(
          method,
          url,
          body,
          options,
          maxRetryAttempts - 1,
        );
      }
      this.mapAndThrowError(error);
    }
  }

  /**
   * Builds a base Axios config:
   * - Merges default headers with per-call headers using a strictly-typed object.
   * - Applies query params and timeout.
   * - Leaves baseURL untouched (configure it in HttpModule or subclass).
   *
   * Using `satisfies RawAxiosRequestHeaders` keeps header typing strict and
   * avoids `any` / "error" typed pitfalls with Axios internals.
   *
   * @param options Optional per-call options
   * @returns A fresh, side-effect-free Axios config
   */
  protected buildBaseConfig<
    Q extends Record<string, unknown> = Record<string, unknown>,
  >(options?: RestRequestOption<Q>): AxiosRequestConfig {
    const mergedHeaders = {
      ...this.getDefaultHeaders(),
      ...(options?.headers ?? {}),
    } satisfies RawAxiosRequestHeaders;

    const cfg: AxiosRequestConfig = {
      headers: mergedHeaders,
      params: options?.params,
      timeout: options?.timeoutMs ?? 10000,
    };

    return cfg;
  }
}
