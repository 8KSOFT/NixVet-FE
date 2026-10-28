import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendGAEvent = vi.fn();
vi.mock('@next/third-parties/google', () => ({ sendGAEvent: (...a: unknown[]) => sendGAEvent(...a) }));

import { CONSENT_EVENT, CONSENT_KEY, GA_EVENTS, readConsent, readGaClientId, trackEvent, writeConsent } from './analytics';

function definirCookie(valor: string) {
  document.cookie = `_ga=${valor}; path=/`;
}

beforeEach(() => {
  document.cookie = '_ga=; max-age=0; path=/';
});

describe('consentimento (opt-in da LGPD)', () => {
  it('sem resposta é null, e valor estranho também', () => {
    expect(readConsent()).toBeNull();
    localStorage.setItem(CONSENT_KEY, 'talvez');
    expect(readConsent()).toBeNull();
  });

  it('grava, lê e avisa a própria aba (o evento storage só chega nas outras)', () => {
    const ouvinte = vi.fn();
    window.addEventListener(CONSENT_EVENT, ouvinte);
    writeConsent('granted');
    expect(readConsent()).toBe('granted');
    expect((ouvinte.mock.calls[0][0] as CustomEvent).detail).toBe('granted');
    writeConsent('denied');
    expect(readConsent()).toBe('denied');
    window.removeEventListener(CONSENT_EVENT, ouvinte);
  });

  it('storage bloqueado conta como "não respondeu", nunca como "aceitou"', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(readConsent()).toBeNull();
  });

  it('storage bloqueado na escrita não quebra o clique', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => writeConsent('granted')).not.toThrow();
  });
});

describe('readGaClientId', () => {
  it('sem consentimento nunca devolve identificador, mesmo com o cookie presente', () => {
    definirCookie('GA1.1.1234567890.1699999999');
    expect(readGaClientId()).toBeNull();
    writeConsent('denied');
    expect(readGaClientId()).toBeNull();
  });

  it('com consentimento, extrai os dois últimos trechos do cookie', () => {
    writeConsent('granted');
    definirCookie('GA1.1.1234567890.1699999999');
    expect(readGaClientId()).toBe('1234567890.1699999999');
  });

  it('cookie ausente ou em formato que o backend recusaria vira null', () => {
    writeConsent('granted');
    expect(readGaClientId()).toBeNull();
    definirCookie('GA1.1');
    expect(readGaClientId()).toBeNull();
    definirCookie('GA1.1.abc.def');
    expect(readGaClientId()).toBeNull();
  });
});

describe('trackEvent', () => {
  beforeEach(() => sendGAEvent.mockClear());

  it('não dispara sem NEXT_PUBLIC_GA_ID', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_ID', '');
    writeConsent('granted');
    trackEvent(GA_EVENTS.SIGN_UP_START);
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('não dispara sem consentimento', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TESTE');
    trackEvent(GA_EVENTS.SIGN_UP_START);
    writeConsent('denied');
    trackEvent(GA_EVENTS.SIGN_UP_START);
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('com consentimento e GA_ID, dispara com o nome e os parâmetros', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TESTE');
    writeConsent('granted');
    trackEvent(GA_EVENTS.BEGIN_CHECKOUT, { plan: 'clinica', value: 299 });
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'begin_checkout', { plan: 'clinica', value: 299 });
  });

  it('bloqueador de anúncios derrubando o gtag não derruba o fluxo', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TESTE');
    writeConsent('granted');
    sendGAEvent.mockImplementationOnce(() => {
      throw new Error('gtag bloqueado');
    });
    expect(() => trackEvent('x')).not.toThrow();
  });

  it('nomes do funil não mudam (o backend dispara os mesmos)', () => {
    expect(GA_EVENTS).toEqual({
      SIGN_UP_START: 'sign_up_start',
      SIGN_UP_COMPLETE: 'sign_up_complete',
      ONBOARDING_STEP: 'onboarding_step',
      BEGIN_CHECKOUT: 'begin_checkout',
    });
  });
});
