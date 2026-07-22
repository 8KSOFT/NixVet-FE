/**
 * Envelope padrao das respostas de sucesso da API (ver DOCS/response-phase-1-front.md
 * e DOCS/response-phase-4-front.md): { success, message, data }.
 * Nem todo endpoint ja foi migrado — use `isApiEnvelope` para detectar em runtime.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function isApiEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  if (!body || typeof body !== 'object') return false;
  const o = body as Record<string, unknown>;
  return typeof o.success === 'boolean' && typeof o.message === 'string' && 'data' in o;
}

/**
 * Symbol nao-enumeravel usado para "grudar" a mensagem do backend no payload
 * ja desembrulhado, sem afetar spread/JSON.stringify/consumo normal do dado.
 * Lido pelo mutationCache global (AppProviders.tsx) para disparar o toast de sucesso.
 */
export const API_MESSAGE = Symbol('apiMessage');

export function getApiMessage(value: unknown): string | undefined {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return undefined;
  const msg = (value as Record<symbol, unknown>)[API_MESSAGE];
  return typeof msg === 'string' ? msg : undefined;
}
