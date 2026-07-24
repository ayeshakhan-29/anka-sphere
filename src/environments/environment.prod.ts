const envApiUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && (process.env as any)?.VITE_API_URL) ||
  '';

export const environment = {
  production: true,
  apiUrl: envApiUrl ? envApiUrl.replace(/\/$/, '') : '',
};

