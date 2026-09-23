import { codigoDoProblema, problemaDe } from '@/lib/problem';

/**
 * Mensagem de erro da API para mostrar ao usuário.
 *
 * Passa por `problemaDe`, que entende tanto `application/problem+json` (E12)
 * quanto o envelope antigo — as 26 telas que já chamam esta função não
 * precisam saber qual formato veio.
 *
 * Em 5xx acrescenta "Código: <8 chars>" do `request_id`: é o que o usuário
 * lê para o suporte e o que acha a linha no log (E11). Em 4xx não — ali a
 * mensagem é sobre o que ele digitou, e um código só polui.
 */
export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const problema = problemaDe(error);
  const doErro = (error as { message?: string } | null | undefined)?.message;

  if (!problema) return doErro ?? fallbackMessage;

  const base = problema.detail || doErro || fallbackMessage;
  const codigo = problema.status >= 500 ? codigoDoProblema(problema) : undefined;
  return codigo && !base.includes(codigo) ? `${base} Código: ${codigo}` : base;
}
