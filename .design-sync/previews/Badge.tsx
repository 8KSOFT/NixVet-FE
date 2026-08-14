import { Badge } from "nixvet-ui";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="default">Ativo</Badge>
    <Badge variant="secondary">Rascunho</Badge>
    <Badge variant="destructive">Vencido</Badge>
    <Badge variant="outline">Arquivado</Badge>
  </div>
);

export const RoleColors = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="veterinarian">Veterinário</Badge>
    <Badge variant="reception">Recepção</Badge>
    <Badge variant="intern">Estagiário</Badge>
    <Badge variant="manager">Gerente</Badge>
    <Badge variant="admin">Admin</Badge>
  </div>
);
