/**
 * Erro do lado do servidor do Next (render, proxy, rota) em uma linha JSON.
 *
 * Até 01/10/2026 esses erros saíam como texto solto no log do container —
 * stack em várias linhas, sem nível, sem a rota —, impossíveis de filtrar no
 * `get_logs` como as linhas da API. Mesmo formato do logger do backend (E11):
 * `timestamp`, `level`, `logger`, `message`, mais `path`, `method` e o
 * `digest`, que é o "Código" que a tela de erro mostra ao usuário (ver
 * components/error-screen.tsx) — o suporte acha a linha por ele.
 *
 * Sem PII: nada de headers, cookie ou corpo da requisição.
 */
import type { Instrumentation } from 'next';

export function register(): void {
  // Nada a registrar: sem OpenTelemetry por enquanto (não há coletor na
  // plataforma). `onRequestError` abaixo não depende disto.
}

export const onRequestError: Instrumentation.onRequestError = (erro, request, contexto) => {
  const e = erro as Error & { digest?: string };
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      severity: 3,
      service: 'front',
      logger: 'next.onRequestError',
      message: e?.message ?? String(erro),
      digest: e?.digest,
      method: request.method,
      path: request.path,
      route: contexto.routePath,
      route_type: contexto.routeType,
      render_source: contexto.renderSource,
      traceback: e?.stack?.split('\n').slice(0, 15).join('\n'),
    }),
  );
};
