export interface TokenProvider {
  /** Return a cached access token (fetching on miss). */
  get(): Promise<string>;

  /** Invalidate cache so next `get()` fetches fresh token. */
  forceRefresh(): Promise<void>;
}
