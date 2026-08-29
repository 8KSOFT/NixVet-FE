'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CONSENT_EVENT, readConsent, writeConsent } from '@/lib/analytics';

/**
 * Banner de consentimento de cookies de medição.
 *
 * Aparece só enquanto a pessoa não respondeu. "Recusar" é uma resposta como
 * outra qualquer e fica guardada — banner que reaparece depois do "não" é
 * insistência, não consentimento.
 *
 * Não há botão de fechar sem escolher, de propósito: um "X" que some com o
 * aviso sem registrar nada deixaria a pessoa sem rastreamento mas com o
 * banner voltando sempre, ou — pior — seria lido como aceite tácito.
 */
export default function CookieConsent() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    // No efeito, não no render: no servidor não existe localStorage, e ler
    // durante o render faria o HTML do SSR discordar do cliente.
    setVisivel(readConsent() === null);
    const aoMudar = () => setVisivel(readConsent() === null);
    window.addEventListener(CONSENT_EVENT, aoMudar);
    return () => window.removeEventListener(CONSENT_EVENT, aoMudar);
  }, []);

  // Sem medição configurada não há o que consentir — pedir permissão para
  // algo que não acontece só treina o usuário a clicar em "aceitar".
  if (!gaId || !visivel) return null;

  const responder = (valor: 'granted' | 'denied') => () => {
    writeConsent(valor);
    setVisivel(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <p className="flex-1 text-[13.5px] leading-relaxed text-gray-600">
          Usamos cookies de medição para entender como o site é usado e
          melhorá-lo. Eles só são ativados se você aceitar. Veja a{' '}
          <Link
            href="/privacidade"
            className="font-semibold text-brand-deep underline underline-offset-2 hover:text-brand-deep/80"
          >
            Política de Privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={responder('denied')}
            className="flex-1 rounded-full sm:flex-none"
          >
            Recusar
          </Button>
          <Button
            onClick={responder('granted')}
            className="flex-1 rounded-full bg-brand-deep text-white hover:bg-brand-deep/90 sm:flex-none"
          >
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
