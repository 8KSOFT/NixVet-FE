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
 * Nomes dos eventos GA4 do funil, num lugar só.
 *
 * Estão aqui porque metade deles não é disparada por este arquivo: os três
 * últimos saem do backend, pelo Measurement Protocol
 * (`NixVet-BE/src/common/analytics/ga4.service.ts`). Um nome divergente entre
 * os dois lados não dá erro em lugar nenhum — só produz um evento órfão no
 * relatório, que ninguém percebe até a análise não fechar.
 *
 * | Evento             | Onde dispara | Parâmetros                        |
 * |--------------------|--------------|-----------------------------------|
 * | `sign_up_start`    | front        | `origem` (qual CTA)               |
 * | `sign_up_complete` | front        | `tenant_id`                       |
 * | `onboarding_step`  | front        | `step_name`, `step_group`, `step_number` |
 * | `begin_checkout`   | front        | `plan`, `value`, `currency`, `forma` |
 *
 * `step_group` separa dois funis que compartilham o evento: `cadastro` (as 6
 * etapas obrigatórias de `/register`) e `checklist` (os 8 itens opcionais do
 * `SetupChecklistWidget`, dentro do app).
 *
 * Todos os eventos de backend carregam `tenant_id` automaticamente, e o
 * `client_id` deles sai de `tenants.ga_client_id` — o cookie `_ga` que
 * `readGaClientId()` copia daqui no cadastro e no checkout.
 * | `feature_activated`| backend      | `feature`                         |
 * | `purchase`         | backend      | `plan`, `value`, `currency`, `transaction_id` |
 * | `week_active`      | backend      | `week_start`, `logins`, `actions` |
 */
export const GA_EVENTS = {
  SIGN_UP_START: 'sign_up_start',
  SIGN_UP_COMPLETE: 'sign_up_complete',
  ONBOARDING_STEP: 'onboarding_step',
  BEGIN_CHECKOUT: 'begin_checkout',
} as const;

/**
 * `client_id` do GA4 desta visita, lido do cookie `_ga`.
 *
 * Serve para mandar ao backend nos dois pontos em que a clínica se identifica
 * (cadastro e início do checkout). Os eventos que o servidor dispara depois —
 * `purchase` no webhook do Asaas, `week_active` no cron, `feature_activated`
 * no primeiro prontuário — nascem onde não há navegador nenhum; sem este
 * valor guardado eles abrem sessão própria de origem `(direct)` e a receita
 * nunca volta para a campanha que trouxe o cadastro.
 *
 * O cookie tem a forma `GA1.1.<client_id>`, onde o `client_id` são os dois
 * últimos trechos (`1234567890.1699999999`) — é isso, e não o cookie inteiro,
 * que o Measurement Protocol espera.
 *
 * Devolve `null` quando não há consentimento: sem o "Aceitar" o script do
 * Google nem carrega, então o cookie não existe. A checagem explícita está
 * aqui de qualquer forma — este valor sai da máquina do usuário para o nosso
 * servidor, e quem recusou medição não manda identificador de medição a
 * lugar nenhum.
 */
export function readGaClientId(): string | null {
  if (typeof document === 'undefined') return null;
  if (readConsent() !== 'granted') return null;
  try {
    const bruto = document.cookie
      .split('; ')
      .find((c) => c.startsWith('_ga='))
      ?.slice('_ga='.length);
    if (!bruto) return null;

    const partes = bruto.split('.');
    if (partes.length < 4) return null;
    const clientId = partes.slice(-2).join('.');

    // O backend recusa qualquer coisa fora deste formato; conferir aqui evita
    // mandar uma requisição que já se sabe que vai voltar 400 e derrubar um
    // cadastro por causa de medição.
    return /^\d{1,20}\.\d{1,20}$/.test(clientId) ? clientId : null;
  } catch {
    // Cookies bloqueados. Medição é acessório: segue sem.
    return null;
  }
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
