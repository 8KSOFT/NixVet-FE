'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CURRENCY_BY_LANGUAGE, resolveAppLanguage } from '@/lib/i18n/currency';

function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatCents(cents: number, locale: string): string {
  return (cents / 100).toLocaleString(locale, {
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

/** Input de moeda: dígitos entram da direita (estilo app bancário), exibe o
 * símbolo (R$/U$/Peso) fixo à esquerda conforme o idioma ativo da plataforma. */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, wrapperClassName, ...props }, ref) => {
    const { i18n } = useTranslation();
    const lang = resolveAppLanguage(i18n.language);
    const { symbol, locale } = CURRENCY_BY_LANGUAGE[lang];

    const display =
      value === '' || value == null ? '' : formatCents(Math.round(Number(value) * 100) || 0, locale);

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
          {symbol}
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          className={cn('w-full pl-9', symbol.length > 2 && 'pl-12', className)}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
