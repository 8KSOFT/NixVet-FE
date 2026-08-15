import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  Button,
} from "nixvet-ui";

export const Open = () => (
  <DropdownMenu defaultOpen modal={false}>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">Ações</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuLabel>Paciente</DropdownMenuLabel>
      <DropdownMenuItem>
        Editar prontuário
        <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>Agendar retorno</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">Excluir paciente</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
