/**
 * NestJS usa prefixo global `api`. Muitos envs em HML apontam só o host
 * (ex.: http://nixvet-api.8ksoft.com) — normaliza para incluir `/api`.
 */
export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:3001/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}
