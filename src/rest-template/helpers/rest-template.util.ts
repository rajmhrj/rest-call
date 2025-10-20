export const assertNonEmpty = (value: string, label: string): void => {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
};

export const buildUrl = (
  url: string,
  params?: Record<string, string | number | boolean>,
): string => {
  if (!params || Object.keys(params).length === 0) return url;

  const hasQuery = url.includes('?');
  const usp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    // Convert booleans/numbers safely to strings
    usp.append(k, String(v));
  });

  return `${url}${hasQuery ? '&' : '?'}${usp.toString()}`;
};
