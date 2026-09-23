/**
 * Leitura de erro da API — RFC 7807 e o envelope antigo, pela mesma porta
 * (E12, ADR-003).
 *
 * A API responde `application/problem+json` para quem manda o `Accept`
 * (é o que o `axios.ts` faz) e o envelope `{ statusCode, message }` para
 * quem não manda — app publicado, por exemplo. As telas não deveriam saber
 * disso: normalizamos os dois na mesma forma aqui, uma vez.
 *
 * Quando o envelope antigo sair de cena (E12 §11), só este arquivo muda.
 */
export interface Problema {
  status: number;
  /** Mensagem para o usuário. */
  detail: string;
  /** Todas as mensagens de validação, quando houver mais de uma. */
  erros?: string[];
  /** Código de domínio (ex.: `SUBSCRIPTION_READ_ONLY`). */
  code?: string;
  /** `request_id` — o "Código" que a tela mostra e que acha a linha no log. */
  instance?: string;
  title?: string;
}

type CorpoDesconhecido = {
  // RFC 7807
  status?: unknown;
  detail?: unknown;
  title?: unknown;
  instance?: unknown;
  erros?: unknown;
  // envelope antigo
  statusCode?: unknown;
  message?: unknown;
  requestId?: unknown;
  code?: unknown;
};

type ErroComResposta = {
  response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
  config?: { headers?: Record<string, unknown> };
  message?: string;
};

function primeiraString(v: unknown): string | undefined {
  if (typeof v === 'string' && v) return v;
  if (Array.isArray(v)) {
    const s = v.find((x) => typeof x === 'string' && x);
    return typeof s === 'string' ? s : undefined;
  }
  return undefined;
}

/**
 * Normaliza o erro do axios. `null` quando não há resposta da API (rede,
 * timeout, cancelamento) — aí a mensagem é do próprio erro, não do servidor.
 */
export function problemaDe(error: unknown): Problema | null {
  const err = error as ErroComResposta | null | undefined;
  const resp = err?.response;
  if (!resp) return null;
  const corpo = (resp.data ?? {}) as CorpoDesconhecido;

  const status =
    (typeof corpo.status === 'number' ? corpo.status : undefined) ??
    (typeof corpo.statusCode === 'number' ? corpo.statusCode : undefined) ??
    resp.status ??
    0;

  const listaValidacao = Array.isArray(corpo.erros)
    ? (corpo.erros.filter((e) => typeof e === 'string') as string[])
    : Array.isArray(corpo.message)
      ? (corpo.message.filter((e) => typeof e === 'string') as string[])
      : undefined;

  const detail =
    primeiraString(corpo.detail) ?? primeiraString(corpo.message) ?? '';

  // `instance` (7807) ou `requestId` (envelope). Se nenhum vier no corpo, o
  // header da resposta traz — e, em último caso, o id que ESTE cliente gerou
  // na requisição serve igual: é o mesmo valor que o servidor logou.
  const instance =
    primeiraString(corpo.instance) ??
    primeiraString(corpo.requestId) ??
    primeiraString(resp.headers?.['x-request-id']) ??
    primeiraString(err?.config?.headers?.['x-request-id']);

  return {
    status,
    detail,
    ...(listaValidacao && listaValidacao.length > 1 ? { erros: listaValidacao } : {}),
    ...(primeiraString(corpo.code) ? { code: primeiraString(corpo.code) } : {}),
    ...(instance ? { instance } : {}),
    ...(primeiraString(corpo.title) ? { title: primeiraString(corpo.title) } : {}),
  };
}

/** Os 8 primeiros caracteres do `instance` — o que cabe numa tela. */
export function codigoDoProblema(p: Problema | null): string | undefined {
  return p?.instance ? p.instance.slice(0, 8) : undefined;
}
