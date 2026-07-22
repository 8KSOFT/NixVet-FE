'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  /** Valor decimal cru (ex: "25.5"), igual ao que já é guardado no state do form. */
  value: string | number | null | undefined;
  /** Recebe o valor decimal cru atualizado (ex: "25.50"), pronto pra Number(). */
  onValueChange: (value: string) => void;
  /** className do wrapper externo (ex: col-span-* quando o campo vive num grid). */
  wrapperClassName?: string;
}

/** Input de moeda BRL: dígitos entram da direita (estilo app bancário), exibe "R$" fixo à esquerda. */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, wrapperClassName, ...props }, ref) => {
    const display =
      value === '' || value == null ? '' : formatCentsToBRL(Math.round(Number(value) * 100) || 0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '');
      if (!digits) {
        onValueChange('');
        return;
      }
      onValueChange(centsToDecimalString(parseInt(digits, 10)));
    };

    return (
      <div className={cn('relative', wrapperClassName)}>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          className={cn('w-full pl-9', className)}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
