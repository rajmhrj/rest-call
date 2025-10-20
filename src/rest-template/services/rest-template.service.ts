import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RawAxiosRequestHeaders, AxiosRequestConfig, AxiosError } from 'axios';

import type {
  RequestContext,
  UpstreamErrorBody,
} from './abs-rest-template.service.js';
import { AbstractRestTemplate } from './abs-rest-template.service.js';

@Injectable()
export class RestTemplateService extends AbstractRestTemplate {
  protected getDefaultHeaders(): Readonly<RawAxiosRequestHeaders> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  protected applyAuth(
    config: AxiosRequestConfig,
    context?: RequestContext,
  ): Promise<AxiosRequestConfig> | AxiosRequestConfig {
    if (!context?.token) {
      return config;
    }

    const baseHeaders: RawAxiosRequestHeaders = {
      ...((config.headers as RawAxiosRequestHeaders | undefined) ?? {}),
    };

    return {
      ...config,
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${context.token}`,
      },
    };
  }

  protected mapAndThrowError(error: unknown): never {
    const ax = error as AxiosError<UpstreamErrorBody>;
    const status = ax.response?.status ?? HttpStatus.BAD_GATEWAY;
    const message =
      ax.response?.data?.message ?? ax.message ?? 'Upstream request failed';
    const payload = {
      message,
      code: ax.response?.data?.code ?? 'UPSTREAM_ERROR',
      details: ax.response?.data?.details,
    };
    throw new HttpException(payload, status);
  }
}
