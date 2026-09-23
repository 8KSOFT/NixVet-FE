'use client';

import { ErrorScreen } from '@/components/error-screen';

/**
 * Erro em qualquer página autenticada (E15). Sem este arquivo o Next subia a
 * falha até o limite da árvore e o usuário via tela branca.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} />;
}
