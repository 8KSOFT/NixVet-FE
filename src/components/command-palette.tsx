"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getSearchableNavItems } from "@/config/navigation";
import { QUICK_CREATE_ACTIONS } from "@/config/quick-create";
import { usePatientsListQuery } from "@/hooks/apiHooks/usePatients";
import { useTutorsListQuery } from "@/hooks/apiHooks/useTutors";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuAllow: Set<string>;
}

const MAX_RECORD_RESULTS = 8;

export function CommandPalette({ open, onOpenChange, menuAllow }: CommandPaletteProps) {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");

  // Debounce leve só para a busca de registros (nome/CPF sobre a lista completa);
  // a filtragem de Telas/Ações rápidas já é feita pelo cmdk em tempo real via CommandInput.
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(rawQuery.trim().toLowerCase()), 250);
    return () => window.clearTimeout(id);
  }, [rawQuery]);

  useEffect(() => {
    if (!open) {
      setRawQuery("");
      setQuery("");
    }
  }, [open]);

  // Só interessa buscar registros quando o palette é usado — mas os hooks já são
  // compartilhados (mesma queryKey) com o resto do app via react-query, então abrir
  // o Ctrl/Cmd+K não dispara uma requisição nova se a lista já estiver em cache.
  const { data: patients = [] } = usePatientsListQuery();
  const { data: tutors = [] } = useTutorsListQuery();

  const navItems = useMemo(() => getSearchableNavItems(menuAllow), [menuAllow]);

  const quickCreateActions = useMemo(
    () => QUICK_CREATE_ACTIONS.filter((action) => menuAllow.has(action.menuKey)),
    [menuAllow],
  );

  const matchedPatients = useMemo(() => {
    if (!query) return [];
    return patients
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.chip_number?.toLowerCase().includes(query),
      )
      .slice(0, MAX_RECORD_RESULTS);
  }, [patients, query]);

  const matchedTutors = useMemo(() => {
    if (!query) return [];
    return tutors
      .filter(
        (owner) =>
          owner.name?.toLowerCase().includes(query) ||
          owner.cpf?.toLowerCase().includes(query),
      )
      .slice(0, MAX_RECORD_RESULTS);
  }, [tutors, query]);

  // Fecha o palette antes/junto da navegação — router.push é assíncrono, então
  // chamar onOpenChange(false) depois deixaria o diálogo visível por alguns frames.
  const goTo = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca rápida"
      description="Navegue, crie registros ou busque pacientes e responsáveis"
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder="Buscar telas, ações ou registros..."
        value={rawQuery}
        onValueChange={setRawQuery}
      />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {quickCreateActions.length > 0 && (
          <CommandGroup heading="Ações rápidas">
            {quickCreateActions.map((action) => (
              <CommandItem
                key={action.key}
                value={action.label}
                onSelect={() => goTo(action.href)}
              >
                <action.icon />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Telas">
          {navItems.map((item) => (
            <CommandItem
              key={item.key}
              value={t(item.labelKey)}
              onSelect={() => goTo(item.href)}
            >
              <item.icon />
              <span>{t(item.labelKey)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {query && matchedPatients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pacientes">
              {matchedPatients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={`${patient.name} ${patient.id}`}
                  onSelect={() => goTo(`/medical-records/prontuario/${patient.id}`)}
                >
                  <span>{patient.name}</span>
                  {patient.breed && (
                    <span className="text-xs text-muted-foreground">{patient.breed}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {query && matchedTutors.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Responsáveis">
              {matchedTutors.map((owner) => (
                <CommandItem
                  key={owner.id}
                  value={`${owner.name} ${owner.id}`}
                  onSelect={() => goTo("/owners")}
                >
                  <span>{owner.name}</span>
                  {owner.cpf && <span className="text-xs text-muted-foreground">{owner.cpf}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
