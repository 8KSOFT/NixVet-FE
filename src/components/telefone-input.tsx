'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { formatarTelefone } from '@/lib/telefone';

type TelefoneInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  /** Dígitos ou já formatado: o campo sempre mostra a máscara. */
  value: string | null | undefined;
  /** Devolve o valor já com a máscara; na hora de enviar, use `somenteDigitos`. */
  onValueChange: (valor: string) => void;
};

/**
 * Campo de telefone brasileiro com máscara `(11) 91234-5678`, aplicada a cada
 * tecla. Sem `maxLength` de propósito: o navegador cortaria o texto colado
 * ("+55 11 91234-5678") antes de a máscara poder tirar o código do país.
 */
export function TelefoneInput({ value, onValueChange, placeholder, ...props }: TelefoneInputProps) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder={placeholder ?? '(11) 91234-5678'}
      value={formatarTelefone(value ?? '')}
      onChange={(e) => onValueChange(formatarTelefone(e.target.value))}
    />
  );
}
