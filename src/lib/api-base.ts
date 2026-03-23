/**
 * Resolve a base URL da API (NestJS prefixo `/api`).
 *
 * Aceita:
 *   - URL absoluta: "http://host:3001" ou "https://host/api"
 *   - "same-origin" / "relative" → `/api` (proxy no mesmo host)
 *   - vazio → localhost dev
 *
 * **Auto-upgrade:** se a página está em HTTPS e a URL configurada é HTTP,
 * troca o esquema para HTTPS automaticamente, evitando mixed-content.
 */
export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:3001/api';

  const sentinel = raw.toLowerCase();
  if (sentinel === 'same-origin' || sentinel === 'relative') {
    return '/api';
  }

  let url = raw.endsWith('/api') ? raw : `${raw}/api`;

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    url.startsWith('http://')
  ) {
    url = url.replace(/^http:\/\//, 'https://');
  }

  return url;
}
