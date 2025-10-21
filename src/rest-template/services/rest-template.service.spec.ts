import type { AxiosRequestConfig } from 'axios';
import type { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { RestTemplateService } from './rest-template.service.js';

describe('RestTemplateService', () => {
  let httpService: HttpService;
  let service: RestTemplateService;

  beforeEach(() => {
    httpService = {
      axiosRef: { request: jest.fn() },
    } as unknown as HttpService;

    service = new RestTemplateService(httpService);
  });

  describe('applyAuth', () => {
    it('returns original config when context lacks token', async () => {
      const config: AxiosRequestConfig = {
        headers: { 'X-Trace': 'trace-123' },
        timeout: 5000,
      };

      const result = await (
        service as unknown as {
          applyAuth(
            cfg: AxiosRequestConfig,
            ctx?: Record<string, unknown>,
          ): Promise<AxiosRequestConfig> | AxiosRequestConfig;
        }
      ).applyAuth(config, {});

      expect(result).toBe(config);
    });

    it('adds Authorization header when context provides token', async () => {
      const config: AxiosRequestConfig = {
        headers: { 'X-Trace': 'trace-123' },
        timeout: 5000,
      };

      const result = await (
        service as unknown as {
          applyAuth(
            cfg: AxiosRequestConfig,
            ctx?: { token?: string },
          ): Promise<AxiosRequestConfig> | AxiosRequestConfig;
        }
      ).applyAuth(config, { token: 'access-token' });

      expect(result).not.toBe(config);
      expect(result).toMatchObject({
        headers: {
          'X-Trace': 'trace-123',
          Authorization: 'Bearer access-token',
        },
        timeout: 5000,
      });
    });
  });

  describe('mapAndThrowError', () => {
    it('rethrows upstream error as HttpException using response payload', () => {
      const upstreamError = {
        message: 'Request failed with status code 401',
        response: {
          status: 401,
          data: {
            message: 'Unauthorized',
            code: 'INVALID_TOKEN',
            details: { reason: 'token expired' },
          },
        },
      };

      let caught: unknown;
      try {
        (
          service as unknown as {
            mapAndThrowError(err: unknown): never;
          }
        ).mapAndThrowError(upstreamError);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(HttpException);
      const httpErr = caught as HttpException;

      expect(httpErr.getStatus()).toBe(401);
      expect(httpErr.getResponse()).toMatchObject({
        message: 'Unauthorized',
        code: 'INVALID_TOKEN',
        details: { reason: 'token expired' },
      });
    });

    it('uses fallback values when upstream response is missing', () => {
      const upstreamError = { message: 'network timeout' };

      let caught: unknown;
      try {
        (
          service as unknown as {
            mapAndThrowError(err: unknown): never;
          }
        ).mapAndThrowError(upstreamError);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(HttpException);
      const httpErr = caught as HttpException;

      expect(httpErr.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(httpErr.getResponse()).toMatchObject({
        message: 'network timeout',
        code: 'UPSTREAM_ERROR',
        details: undefined,
      });
    });
  });
});
