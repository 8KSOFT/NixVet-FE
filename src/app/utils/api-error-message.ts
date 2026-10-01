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
  const semResposta = mensagemSemResposta(error);
  if (semResposta) return semResposta;

  const problema = problemaDe(error);
  const doErro = (error as { message?: string } | null | undefined)?.message;

  if (!problema) return doErro ?? fallbackMessage;

  const base = problema.detail || doErro || fallbackMessage;
  const codigo = problema.status >= 500 ? codigoDoProblema(problema) : undefined;
  return codigo && !base.includes(codigo) ? `${base} Código: ${codigo}` : base;
}

/**
 * Requisição que não teve resposta (rede caiu, timeout, CORS). O axios põe em
 * `message` o texto técnico em inglês — "Network Error", "timeout of 20000ms
 * exceeded" — e era isso que ia para o toast.
 */
function mensagemSemResposta(error: unknown): string | null {
  const e = error as { isAxiosError?: boolean; response?: unknown; code?: string } | null;
  if (!e?.isAxiosError || e.response) return null;
  if (e.code === 'ERR_CANCELED') return null;
  if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
    return 'O servidor demorou para responder. Tente de novo em instantes.';
  }
  return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
}
