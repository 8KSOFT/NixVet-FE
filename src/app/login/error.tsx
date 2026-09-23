'use client';

import { ErrorScreen } from '@/components/error-screen';

/** Fluxo sem sessão — o `error.tsx` de `(app)` não cobre. */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} />;
}
