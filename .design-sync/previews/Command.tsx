import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "nixvet-ui";

export const Default = () => (
  <Command className="w-80 rounded-lg border shadow-sm">
    <CommandInput placeholder="Buscar paciente, tutor ou ação..." />
    <CommandList>
      <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
      <CommandGroup heading="Pacientes">
        <CommandItem>Rex — Labrador</CommandItem>
        <CommandItem>Mel — Gato SRD</CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Ações">
        <CommandItem>
          Novo agendamento
          <CommandShortcut>⌘N</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);
