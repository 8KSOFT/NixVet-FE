'use client';

import { useCallback, useEffect, useRef } from 'react';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_ID = 'cf-turnstile-script';

type Turnstile = {
  render: (alvo: HTMLElement, opcoes: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
    onloadTurnstileCallback?: () => void;
  }
}

/** Carrega o script uma única vez por página, mesmo com vários widgets. */
let promessaDoScript: Promise<void> | null = null;
function carregarScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (promessaDoScript) return promessaDoScript;

  promessaDoScript = new Promise<void>((resolve, reject) => {
    const existente = document.getElementById(SCRIPT_ID);
    if (existente) {
      existente.addEventListener('load', () => resolve());
      existente.addEventListener('error', () => reject(new Error('turnstile: falha ao carregar')));
      return;
    }
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile: falha ao carregar'));
    document.head.appendChild(s);
  });
  return promessaDoScript;
}

interface Props {
  /** Recebe o token; `null` quando expira, falha ou ainda não resolveu. */
  onToken: (token: string | null) => void;
  className?: string;
}

/**
 * Widget do Cloudflare Turnstile.
 *
 * Sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY` o componente não renderiza nada e
 * chama `onToken(null)` — o formulário segue funcionando e o backend, que
 * também está desligado nesse cenário, aceita sem token. É o que mantém o
 * ambiente local usável sem chave.
 *
 * O token do Turnstile expira em torno de 5 minutos. O `expired-callback`
 * devolve `null` para o formulário saber que precisa esperar um token novo em
 * vez de mandar um vencido, que o backend recusaria com uma mensagem que o
 * usuário não teria como entender.
 */
export default function TurnstileWidget({ onToken, className }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  // Em ref, não em dependência do efeito: se `onToken` vier de uma closure
  // recriada a cada render (o caso comum), o widget seria destruído e
  // recriado a cada tecla digitada no formulário.
  const aoToken = useRef(onToken);
  aoToken.current = onToken;

  const montar = useCallback(() => {
    if (!siteKey || !container.current || !window.turnstile) return;
    if (widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      language: 'pt-br',
      appearance: 'interaction-only',
      callback: (token: string) => aoToken.current(token),
      'expired-callback': () => aoToken.current(null),
      'error-callback': () => aoToken.current(null),
    });
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) {
      onToken(null);
      return;
    }
    let vivo = true;
    carregarScript()
      .then(() => {
        if (vivo) montar();
      })
      .catch(() => {
        // Script bloqueado (extensão, rede corporativa): o formulário fica
        // sem token e o backend responde com mensagem clara. Melhor do que
        // travar o botão para sempre sem explicação.
        aoToken.current(null);
      });
    return () => {
      vivo = false;
      const id = widgetId.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* widget já removido com o nó do DOM */
        }
      }
      widgetId.current = null;
    };
    // `onToken` de propósito fora das dependências — ver o ref acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, montar]);

  if (!siteKey) return null;

  return <div ref={container} className={className} />;
}
