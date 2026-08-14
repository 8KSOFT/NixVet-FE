import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from "nixvet-ui";

export const Open = () => (
  <Dialog defaultOpen>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo agendamento</DialogTitle>
        <DialogDescription>
          Cadastre uma consulta para o paciente Rex.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dialog-date">Data</Label>
          <Input id="dialog-date" type="date" defaultValue="2026-08-20" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dialog-vet">Veterinário</Label>
          <Input id="dialog-vet" defaultValue="Dra. Mariana Lopes" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">Cancelar</Button>
        <Button>Agendar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
