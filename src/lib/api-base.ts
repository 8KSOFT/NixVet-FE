/**
 * NestJS usa prefixo global `api`. Muitos envs apontam só o host
 * (ex.: https://nixvet-api.8ksoft.com) — normaliza para incluir `/api`.
 *
 * **same-origin / relative** → retorna `/api` (mesmo protocolo e host da página).
 * Use quando o reverse proxy expõe o backend em `https://seu-front/api/*` (evita
 * mixed-content: página HTTPS chamando API em HTTP em outro host).
 *
 * HML “só HTTP” no browser: front e API na mesma origem HTTP, ou ambos HTTPS,
 * ou proxy `/api` + `same-origin`.
 */
export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:3001/api';

  const sentinel = raw.toLowerCase();
  if (sentinel === 'same-origin' || sentinel === 'relative') {
    return '/api';
  }

  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
}
