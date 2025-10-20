import {
  Method,
  AxiosResponse,
  AxiosRequestConfig,
  RawAxiosRequestHeaders,
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
   * Core request path shared by all verbs.
   * - Builds a base config with defaults + per-call overrides.
   * - Invokes {@link applyAuth} to attach credentials/tracing.
   * - Executes the request via Axios.
   * - Returns either `data` or the full response based on {@link ResponseMode}.
   *
   * @template T Response body type
   * @template Q Query params type
   * @template B Request body type
   *
   * @param method HTTP method ("GET" | "POST" | ...)
   * @param url Absolute or relative URL (relative uses Axios baseURL if set)
   * @param body Optional request body (POST/PUT/PATCH)
   * @param options See {@link RestRequestOption}
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
