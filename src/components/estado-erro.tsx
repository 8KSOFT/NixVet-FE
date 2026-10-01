'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { cn } from '@/lib/utils';

/**
 * Falha ao CARREGAR dados de uma tela (query), com "Tentar de novo".
 *
 * Existe porque, até 01/10/2026, nenhuma tela lia `isError`: um 5xx depois dos
 * retries caía no estado vazio — "Nenhum paciente cadastrado" —, e numa
 * clínica a conclusão óbvia é que os dados sumiram, ou recadastrar o
 * paciente. Erro de render continua com os `error.tsx` (ErrorScreen); este é
 * para o pedido que falhou com a tela de pé.
 *
 * A mensagem sai de `getApiErrorMessage`, que acrescenta o código do
 * `request_id` em 5xx — o que o usuário passa ao suporte.
 */
export function EstadoErro({
  error,
  onRetry,
  mensagem = 'Não foi possível carregar os dados.',
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  mensagem?: string;
  className?: string;
}) {
  const detalhe = error ? getApiErrorMessage(error, mensagem) : mensagem;
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <p className="max-w-md text-sm text-foreground">{detalhe}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={() => onRetry()}>
          <RefreshCw className="mr-2 size-4" aria-hidden />
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}
