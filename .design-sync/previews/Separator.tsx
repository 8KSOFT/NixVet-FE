import { Separator } from "nixvet-ui";

export const Horizontal = () => (
  <div className="w-72">
    <div className="text-sm">Dados do tutor</div>
    <Separator className="my-3" />
    <div className="text-sm">Dados do paciente</div>
  </div>
);

export const Vertical = () => (
  <div className="flex h-8 items-center gap-3 text-sm">
    <span>Prontuário</span>
    <Separator orientation="vertical" />
    <span>Vacinas</span>
    <Separator orientation="vertical" />
    <span>Financeiro</span>
  </div>
);
