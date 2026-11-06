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
import { useSearchPatientsQuery } from "@/hooks/apiHooks/usePatients";
import { useSearchTutorsQuery } from "@/hooks/apiHooks/useTutors";

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

  // Debounce leve só para a busca de registros (evita 1 request por tecla no backend);
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

  // Busca já filtrada no backend (nome/chip_number para pacientes, nome/CPF para
  // tutores) — só dispara quando há termo (enabled: query.length > 0), com o
  // debounce de 250ms acima evitando uma requisição a cada tecla.
  const { data: matchedPatients = [] } = useSearchPatientsQuery(query, MAX_RECORD_RESULTS);
  const { data: matchedTutors = [] } = useSearchTutorsQuery(query, MAX_RECORD_RESULTS);

  const navItems = useMemo(() => getSearchableNavItems(menuAllow), [menuAllow]);

  const quickCreateActions = useMemo(
    () => QUICK_CREATE_ACTIONS.filter((action) => menuAllow.has(action.menuKey)),
    [menuAllow],
  );

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
      title={t("commandPalette.title")}
      description={t("commandPalette.description")}
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder={t("commandPalette.placeholder")}
        value={rawQuery}
        onValueChange={setRawQuery}
      />
      <CommandList>
        <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>

        {quickCreateActions.length > 0 && (
          <CommandGroup heading={t("commandPalette.quickActions")}>
            {quickCreateActions.map((action) => (
              <CommandItem
                key={action.key}
                value={t(action.labelKey)}
                onSelect={() => goTo(action.href)}
              >
                <action.icon />
                <span>{t(action.labelKey)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading={t("commandPalette.screens")}>
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
            <CommandGroup heading={t("commandPalette.patients")}>
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
            <CommandGroup heading={t("commandPalette.owners")}>
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
