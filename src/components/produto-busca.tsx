'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useProductSearchQuery } from '@/hooks/apiHooks/useProducts';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Product, ProductItemType } from '@/app/types/product';
import { cn } from '@/lib/utils';

/**
 * Seletor de produto com busca no servidor (`GET /products?search=&limit=20`).
 *
 * Substitui o `Select` alimentado pelo catálogo inteiro — que o backend agora
 * corta em 500 linhas. `label` é o texto mostrado para o valor atual (o
 * formulário já guarda o nome do produto escolhido), então a tela não precisa
 * ter o produto numa lista local.
 */
export function ProdutoBusca({
  value,
  label,
  onChange,
  placeholder,
  disabled,
  itemType,
  className,
}: {
  value: string | null | undefined;
  label?: string;
  onChange: (product: Product) => void;
  placeholder?: string;
  disabled?: boolean;
  itemType?: ProductItemType;
  className?: string;
}) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [termoDebounced, setTermoDebounced] = useState('');

  // 250 ms: uma requisição por pausa na digitação, não por tecla.
  useEffect(() => {
    const id = setTimeout(() => setTermoDebounced(termo), 250);
    return () => clearTimeout(id);
  }, [termo]);

  const { data, isFetching, isError } = useProductSearchQuery(
    { search: termoDebounced, itemType, limit: 20 },
    aberto,
  );
  const resultados = data?.items ?? [];

  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) setTermo('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className={cn('h-9 w-full justify-between font-normal', className)}
        >
          <span className={cn('truncate', !(value && label) && 'text-muted-foreground')}>
            {value && label ? label : placeholder ?? t('productPicker.placeholder')}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        {/* `shouldFilter={false}`: quem filtra é o servidor. */}
        <Command shouldFilter={false}>
          <CommandInput value={termo} onValueChange={setTermo} placeholder={t('productPicker.searchPlaceholder')} />
          <CommandList>
            {isFetching && resultados.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('productPicker.loading')}
              </div>
            ) : (
              <CommandEmpty>{isError ? t('productPicker.error') : t('productPicker.empty')}</CommandEmpty>
            )}
            <CommandGroup>
              {resultados.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p);
                    setAberto(false);
                    setTermo('');
                  }}
                >
                  <Check className={cn('size-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">
                    {p.name} — {p.sale_price_formatted ?? fmt(p.sale_price)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
