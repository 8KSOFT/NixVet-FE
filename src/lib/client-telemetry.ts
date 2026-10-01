/**
 * Manda para o servidor o que só aconteceu no navegador (E15).
 *
 * Usa `fetch` com `keepalive` e caminho relativo (proxy same-origin de
 * `/api/*`): `keepalive` é o que permite o envio sobreviver à navegação ou ao
 * fechamento da aba — um erro fatal costuma ser seguido exatamente disso, e
 * um `fetch` normal seria cancelado antes de sair.
 *
 * Nunca lança e nunca espera: telemetria que quebra a página é pior que
 * telemetria nenhuma.
 */
type ErroDoCliente = {
  mensagem: string;
  stack?: string;
  digest?: string;
  rota?: string;
  origem?: string;
  /** `request_id` de uma chamada de API que falhou antes, se houver. */
  requestId?: string;
};

/**
 * `request_id` da última chamada de API que falhou, com o momento.
 *
 * Tela branca costuma vir logo depois de uma resposta que a tela não esperava;
 * mandar o id dessa chamada junto do erro de JS liga as duas pontas no log
 * (o backend grava como `request_id_origem`). Até 01/10/2026 o campo existia
 * no relatório e ninguém o preenchia. Só vale por 60 s — depois disso a
 * falha de API provavelmente não tem relação com o erro.
 */
let ultimaFalha: { id: string; em: number } | null = null;
const VALIDADE_FALHA_MS = 60_000;

export function registrarFalhaDeApi(requestId: string | undefined | null): void {
  if (requestId) ultimaFalha = { id: requestId, em: Date.now() };
}

function requestIdRecente(): string | undefined {
  if (!ultimaFalha || Date.now() - ultimaFalha.em > VALIDADE_FALHA_MS) return undefined;
  return ultimaFalha.id;
}

/** Um envio por mensagem a cada 30 s: página em laço de erro manda centenas. */
const ENVIADOS = new Map<string, number>();
const JANELA_MS = 30_000;

export function reportarErroDoCliente(erro: ErroDoCliente): void {
  if (typeof window === 'undefined' || !erro.mensagem) return;

  const chave = `${erro.mensagem.slice(0, 120)}|${erro.rota ?? ''}`;
  const agora = Date.now();
  if (agora - (ENVIADOS.get(chave) ?? 0) < JANELA_MS) return;
  ENVIADOS.set(chave, agora);

  try {
    void fetch('/api/client-telemetry/erro', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...erro,
        rota: erro.rota ?? window.location.pathname,
        requestId: erro.requestId ?? requestIdRecente(),
      }),
    }).catch(() => undefined);
  } catch {
    /* telemetria não derruba a página */
  }
}

/**
 * Liga os dois eventos que o React não captura: erro fora da árvore de
 * componentes e promise rejeitada sem handler. Sem isto, um
 * `unhandledrejection` num handler de clique não deixa rastro em lugar
 * nenhum.
 *
 * Devolve a função de desligar, para o provider limpar no unmount.
 */
export function instalarCapturaDeErros(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onError = (e: ErrorEvent) =>
    reportarErroDoCliente({
      mensagem: e.message,
      stack: e.error instanceof Error ? e.error.stack : undefined,
      origem: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined,
    });

  const onRejection = (e: PromiseRejectionEvent) => {
    const r = e.reason as unknown;
    reportarErroDoCliente({
      mensagem: r instanceof Error ? r.message : String(r ?? 'promise rejeitada'),
      stack: r instanceof Error ? r.stack : undefined,
      origem: 'unhandledrejection',
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
