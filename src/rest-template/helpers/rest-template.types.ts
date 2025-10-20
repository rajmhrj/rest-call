export type QueryValue = string | number | boolean;
export type QueryParams = Record<string, QueryValue>;
export type RequestHeaders = Record<string, string>;

export interface BaseRequestOptions {
  params?: QueryParams;
  headers?: RequestHeaders;
}

export type GetOptions = BaseRequestOptions;

export interface PostOptions<B> extends BaseRequestOptions {
  body: B;
}
