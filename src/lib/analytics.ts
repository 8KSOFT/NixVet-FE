import { sendGAEvent } from '@next/third-parties/google';

/**
 * Consentimento de analytics — opt-in, como a LGPD pede.
 *
 * Nada de rastreamento carrega antes de um "Aceitar" explícito: o script do
 * GA4 só entra na página depois da escolha, não é o caso de carregar e
 * "desligar" depois. Recusa também é uma resposta e fica guardada, senão o
 * banner voltaria a cada visita perguntando o que a pessoa já respondeu.
 */

export const CONSENT_KEY = 'nixvet-consent-analytics';

/**
 * Evento de janela disparado quando a escolha muda.
 *
 * Existe porque `localStorage` não notifica a própria aba que escreveu nele
 * (o evento `storage` nativo só chega às OUTRAS abas). Sem isto, aceitar os
 * cookies só ligaria o GA4 no próximo carregamento de página.
 */
export const CONSENT_EVENT = 'nixvet:consent-changed';

export type ConsentState = 'granted' | 'denied' | null;

/** `null` = ainda não respondeu; é o que faz o banner aparecer. */
export function readConsent(): ConsentState {
  if (typeof window === 'undefined') return null;
  try {
    const bruto = window.localStorage.getItem(CONSENT_KEY);
    return bruto === 'granted' || bruto === 'denied' ? bruto : null;
  } catch {
    // Modo privado ou storage bloqueado: trata como "não respondeu". Nunca
    // como "aceitou" — na dúvida, não rastreia.
    return null;
  }
}

export function writeConsent(valor: Exclude<ConsentState, null>): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, valor);
  } catch {
    // Sem storage a escolha vale só para esta navegação — melhor isso do que
    // quebrar o clique do usuário.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: valor }));
}

/**
 * Dispara um evento de conversão, se e somente se houver consentimento.
 *
 * A checagem mora aqui, e não em cada ponto de chamada, porque um único
 * `trackEvent` esquecido sem guarda já é vazamento de dado de quem recusou.
 * Sem `NEXT_PUBLIC_GA_ID` a função também não faz nada — em dev e em
 * ambientes sem medição, chamar é inofensivo.
 */
export function trackEvent(nome: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_GA_ID) return;
  if (readConsent() !== 'granted') return;
  try {
    sendGAEvent('event', nome, params);
  } catch {
    // Bloqueador de anúncios derruba o gtag; medição é acessório e nunca
    // pode derrubar o fluxo do usuário junto.
  }
}
