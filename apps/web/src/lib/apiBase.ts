const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://94.183.30.202:3002/api/v1';

const normalizeApiBase = (value: string) =>
  value.replace(/\/+$/, '').replace(/\/api\/v1$/, '') + '/api/v1';

export const apiBase =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:3000/api/v1'
    : typeof window !== 'undefined'
      ? `${window.location.origin}/api/v1`
      : normalizeApiBase(configuredApiUrl);

export const apiOrigin =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:3000'
    : normalizeApiBase(configuredApiUrl).replace(/\/api\/v1$/, '');
