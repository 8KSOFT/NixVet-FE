import { Tooltip, TooltipTrigger, TooltipContent, Button } from "nixvet-ui";

export const Open = () => (
  <div className="flex items-center justify-center p-10">
    <Tooltip defaultOpen>
      <TooltipTrigger asChild>
        <Button variant="outline">Excluir paciente</Button>
      </TooltipTrigger>
      <TooltipContent>Esta ação não pode ser desfeita</TooltipContent>
    </Tooltip>
  </div>
);
