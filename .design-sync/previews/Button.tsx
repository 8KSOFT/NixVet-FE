import { Button } from "nixvet-ui";
import { Plus, Trash2 } from "lucide-react";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="default">Salvar</Button>
    <Button variant="destructive">Excluir</Button>
    <Button variant="outline">Cancelar</Button>
    <Button variant="secondary">Ver detalhes</Button>
    <Button variant="ghost">Fechar</Button>
    <Button variant="link">Esqueci minha senha</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="xs">Extra pequeno</Button>
    <Button size="sm">Pequeno</Button>
    <Button size="default">Padrão</Button>
    <Button size="lg">Grande</Button>
  </div>
);

export const WithIcon = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>
      <Plus /> Novo agendamento
    </Button>
    <Button variant="destructive" size="icon" aria-label="Excluir">
      <Trash2 />
    </Button>
  </div>
);

export const Disabled = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button disabled>Salvar</Button>
    <Button variant="outline" disabled>
      Cancelar
    </Button>
  </div>
);
