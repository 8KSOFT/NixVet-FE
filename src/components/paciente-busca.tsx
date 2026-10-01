'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { usePatientPickerQuery, usePatientQuery } from '@/hooks/apiHooks/usePatients';
import type { PatientRow } from '@/app/types/patient';
import { cn } from '@/lib/utils';

/** "Rex (Canina) — Maria" — o mesmo rótulo que os `Select` de paciente usavam. */
export function rotuloPaciente(p: Pick<PatientRow, 'name' | 'species' | 'tutor'>): string {
  const especie = p.species ? ` (${p.species})` : '';
  const tutor = p.tutor?.name ? ` — ${p.tutor.name}` : '';
  return `${p.name}${especie}${tutor}`;
}

/**
 * Seletor de paciente com busca no servidor.
 *
 * Os formulários (prescrição, exame, internação, orçamento, tarefa…) usavam um
 * `Select` alimentado pela lista COMPLETA de pacientes da clínica — todas as
 * páginas, até 10 mil linhas — baixada ao abrir o formulário. Cresce com a
 * clínica e o formulário demora a ficar utilizável. Aqui o servidor filtra por
 * nome ou chip e devolve 20 por vez.
 *
 * `onChange` entrega também a linha do paciente, para a tela não precisar
 * procurá-lo numa lista que ela não tem mais. Quando o formulário abre já com
 * um paciente (edição, link com `?patientId=`), o rótulo vem de
 * `GET /patients/:id`.
 */
export function PacienteBusca({
  value,
  onChange,
  placeholder,
  disabled,
  tutorId,
  className,
}: {
  value: string | null | undefined;
  onChange: (id: string, paciente: PatientRow | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Restringe aos pacientes de um responsável (agenda filtra por tutor). */
  tutorId?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [termoDebounced, setTermoDebounced] = useState('');
  const [escolhido, setEscolhido] = useState<PatientRow | null>(null);

  // 250 ms: uma requisição por pausa na digitação, não por tecla.
  useEffect(() => {
    const id = setTimeout(() => setTermoDebounced(termo), 250);
    return () => clearTimeout(id);
  }, [termo]);

  const { data: resultados = [], isFetching, isError } = usePatientPickerQuery(
    termoDebounced,
    aberto,
    tutorId,
  );

  // Valor que chegou de fora (edição) e não é o que foi escolhido aqui.
  const precisaDetalhe = !!value && escolhido?.id !== value;
  const { data: detalhe } = usePatientQuery(precisaDetalhe ? value : null);

  const rotulo = useMemo(() => {
    if (!value) return '';
    if (escolhido?.id === value) return rotuloPaciente(escolhido);
    if (detalhe) return rotuloPaciente(detalhe as PatientRow);
    return '';
  }, [value, escolhido, detalhe]);

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
          className={cn('h-10 w-full justify-between font-normal', className)}
        >
          <span className={cn('truncate', !rotulo && 'text-muted-foreground')}>
            {rotulo || (value ? t('patientPicker.loading') : placeholder ?? t('patientPicker.placeholder'))}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        {/* `shouldFilter={false}`: quem filtra é o servidor. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={termo}
            onValueChange={setTermo}
            placeholder={t('patientPicker.searchPlaceholder')}
          />
          <CommandList>
            {isFetching && resultados.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('patientPicker.loading')}
              </div>
            ) : (
              <CommandEmpty>{isError ? t('patientPicker.error') : t('patientPicker.empty')}</CommandEmpty>
            )}
            <CommandGroup>
              {resultados.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    setEscolhido(p);
                    onChange(p.id, p);
                    setAberto(false);
                    setTermo('');
                  }}
                >
                  <Check className={cn('size-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{rotuloPaciente(p)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
