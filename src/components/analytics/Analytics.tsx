'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { CONSENT_EVENT, readConsent, type ConsentState } from '@/lib/analytics';

/**
 * Carrega o GA4 — e só depois do aceite.
 *
 * Enquanto não houver consentimento este componente devolve `null`, então o
 * script do Google sequer é inserido na página. É diferente de carregar e
 * pedir para não medir: aqui não há requisição ao Google nenhuma antes do
 * "Aceitar".
 *
 * A leitura do `localStorage` acontece no efeito, nunca no render: no
 * servidor não existe storage, e ler durante o render faria o HTML do SSR
 * discordar do primeiro render do cliente (erro de hidratação).
 */
export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const [consentimento, setConsentimento] = useState<ConsentState>(null);

  useEffect(() => {
    setConsentimento(readConsent());
    const aoMudar = () => setConsentimento(readConsent());
    window.addEventListener(CONSENT_EVENT, aoMudar);
    return () => window.removeEventListener(CONSENT_EVENT, aoMudar);
  }, []);

  if (!gaId || consentimento !== 'granted') return null;

  return <GoogleAnalytics gaId={gaId} />;
}
