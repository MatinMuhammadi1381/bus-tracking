/// <reference types="vite/client" />

const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

export const apiBase =
  (configuredApiUrl || `${window.location.origin}/api/v1`)
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '') + '/api/v1';

export const appVersion = '1.3.78';
