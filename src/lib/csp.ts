/**
 * Content-Security-Policy do documento HTML (E15).
 *
 * Saiu do `headers()` do next.config para o `proxy.ts` em 01/10/2026 por um
 * motivo: o `headers()` é avaliado no build, então trocar de relatório para
 * bloqueio exigia build novo. No proxy a política é montada por requisição e
 * o modo vem de `CSP_MODE` em tempo de execução — ligar e desligar o bloqueio
 * é trocar a variável e fazer deploy, sem mexer em código (padrão
 * `observe|on` do plano de prontidão).
 *
 *   CSP_MODE=report   (padrão) Content-Security-Policy-Report-Only
 *   CSP_MODE=enforce  Content-Security-Policy
 *   CSP_MODE=off      sem header (só para diagnóstico)
 *
 * Cada origem abaixo veio de um relatório real de produção ou de um uso
 * conferido no código — não acrescentar host "por garantia".
 */

export type CspMode = 'off' | 'report' | 'enforce';

export function cspMode(valor: string | undefined): CspMode {
  const v = (valor ?? '').trim().toLowerCase();
  if (v === 'enforce' || v === 'off') return v;
  return 'report';
}

/** Origem (`https://host[:porta]`) de uma URL, ou null se não for absoluta. */
function origemDe(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null;
  } catch {
    return null;
  }
}

export function buildCsp(opts: { apiUrl?: string; dev?: boolean } = {}): string {
  const api = origemDe(opts.apiUrl);

  const scriptSrc = [
    "'self'",
    // O Next injeta script inline de hidratação; sair disto exige nonce por
    // requisição, que torna toda rota dinâmica (ver E15 §8).
    "'unsafe-inline'",
    // Só o `next dev` (React Refresh) precisa de eval. Em produção ficava
    // liberado sem uso — um vetor a menos.
    ...(opts.dev ? ["'unsafe-eval'"] : []),
    'https://challenges.cloudflare.com', // Turnstile
    'https://www.googletagmanager.com', // GA4 (gtag.js)
    // Web Analytics da Cloudflare: o edge injeta o beacon no HTML (relatório
    // de 01/10/2026, script-src-elem em /).
    'https://static.cloudflareinsights.com',
  ];

  const connectSrc = [
    "'self'",
    'https://*.nixvetapp.com.br',
    // API fora de *.nixvetapp.com.br (homologação em 8ksoft.com, dev local).
    ...(api && !api.endsWith('.nixvetapp.com.br') ? [api] : []),
    // Upload direto por URL pré-assinada (anexo do prontuário, termo da
    // clínica): `directUrl` da plataforma é o PAR cru do OCI; o fallback
    // passa pelo proxy de storage da plataforma.
    'https://objectstorage.sa-saopaulo-1.oraclecloud.com',
    'https://api.plataforma.8ksoft.com',
    'https://viacep.com.br', // busca de CEP no cadastro de tutor/clínica
    // GA4 manda o hit para google.com/g/collect e para as regiões de
    // *.google-analytics.com (relatórios de 28/09 a 01/10/2026).
    'https://www.google.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://challenges.cloudflare.com',
    'https://cloudflareinsights.com',
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    // `blob:`: a prévia de PDF da prescrição abre o arquivo num iframe a
    // partir de um blob (relatório de 01/10/2026, frame-src em /prescriptions).
    'frame-src https://challenges.cloudflare.com blob:',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Caminho relativo: o relatório sai pelo proxy same-origin de `/api/*`.
    'report-uri /api/client-telemetry/csp',
    'report-to nixvet-csp',
  ].join('; ');
}

/** Headers a aplicar na resposta conforme o modo. */
export function cspHeaders(
  mode: CspMode,
  opts: { apiUrl?: string; dev?: boolean } = {},
): Record<string, string> {
  if (mode === 'off') return {};
  const chave = mode === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
  return {
    [chave]: buildCsp(opts),
    // Destino do `report-to` (Reporting API); `report-uri` cobre os
    // navegadores que ainda não implementam.
    'Reporting-Endpoints': 'nixvet-csp="/api/client-telemetry/csp"',
  };
}
