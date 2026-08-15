import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "nixvet-ui";

export const Open = () => (
  <Select defaultOpen defaultValue="vet">
    <SelectTrigger className="w-56">
      <SelectValue placeholder="Selecione um cargo" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Equipe clínica</SelectLabel>
        <SelectItem value="vet">Veterinário(a)</SelectItem>
        <SelectItem value="intern">Estagiário(a)</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Administrativo</SelectLabel>
        <SelectItem value="reception">Recepção</SelectItem>
        <SelectItem value="manager">Gerente</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
);

export const Closed = () => (
  <Select defaultValue="vet">
    <SelectTrigger className="w-56">
      <SelectValue placeholder="Selecione um cargo" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="vet">Veterinário(a)</SelectItem>
      <SelectItem value="reception">Recepção</SelectItem>
    </SelectContent>
  </Select>
);
