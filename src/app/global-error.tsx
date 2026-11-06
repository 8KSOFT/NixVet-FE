'use client';

import { ErrorScreen } from '@/components/error-screen';
import i18n from '@/lib/i18n/instance';

/**
 * Último recurso: erro no próprio layout raiz, onde nenhum `error.tsx` de
 * segmento roda. Precisa trazer `<html>` e `<body>` porque substitui o
 * layout inteiro — é a diferença entre uma tela de erro e nada.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ErrorScreen error={error} reset={reset} titulo={i18n.t('errorScreen.fatalTitle')} />
      </body>
    </html>
  );
}
