import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  Button,
} from "nixvet-ui";

export const Open = () => (
  <div className="flex items-center justify-center p-10">
    <Popover defaultOpen modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">Filtros</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Filtrar pacientes</PopoverTitle>
          <PopoverDescription>
            Ajuste os critérios de busca da lista.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  </div>
);
