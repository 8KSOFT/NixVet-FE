import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Button,
  Label,
  Input,
} from "nixvet-ui";

export const Open = () => (
  <Sheet defaultOpen modal={false}>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Novo paciente</SheetTitle>
        <SheetDescription>
          Cadastre um novo pet para a clínica.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-3 px-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sheet-pet-name">Nome do pet</Label>
          <Input id="sheet-pet-name" defaultValue="Mel" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sheet-species">Espécie</Label>
          <Input id="sheet-species" defaultValue="Gato" />
        </div>
      </div>
      <SheetFooter>
        <Button>Salvar paciente</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
