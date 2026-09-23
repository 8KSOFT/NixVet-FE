'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { reportarErroDoCliente } from '@/lib/client-telemetry';

/**
 * Tela de erro compartilhada pelos `error.tsx` (E15, FE-04).
 *
 * Antes não havia nenhum: um erro de render derrubava a árvore e o usuário
 * ficava com tela branca — sem mensagem, sem código, e sem nada no nosso log,
 * porque erro de cliente não passa pelo servidor.
 *
 * O código que aparece é o `digest` do Next (ele o gera em produção e o
 * mesmo valor vai para o log do servidor no caso de erro de Server
 * Component). É o que o usuário lê para o suporte.
 */
export function ErrorScreen({
  error,
  reset,
  titulo = 'Algo deu errado',
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  titulo?: string;
}) {
  useEffect(() => {
    // Registra uma vez, do lado do servidor, o que só aconteceu no navegador.
    reportarErroDoCliente({
      mensagem: error.message,
      stack: error.stack,
      digest: error.digest,
      rota: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, [error]);

  const codigo = error.digest?.slice(0, 8);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="size-10 text-amber-500" aria-hidden />
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        A página não conseguiu carregar. Já registramos o que aconteceu. Você pode
        tentar de novo — se persistir, informe o código abaixo ao suporte.
      </p>
      {codigo && (
        <p className="rounded-md bg-muted px-3 py-1 font-mono text-xs">Código: {codigo}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {reset && (
          <Button onClick={reset} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 size-4" aria-hidden />
            Tentar de novo
          </Button>
        )}
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard">Ir para o início</Link>
        </Button>
      </div>
    </div>
  );
}
