import { Alert, AlertTitle, AlertDescription } from "nixvet-ui";
import { Info, AlertTriangle } from "lucide-react";

export const Default = () => (
  <Alert className="w-96">
    <Info />
    <AlertTitle>Lembrete de vacinação</AlertTitle>
    <AlertDescription>
      3 pacientes têm doses de reforço vencendo esta semana.
    </AlertDescription>
  </Alert>
);

export const Destructive = () => (
  <Alert variant="destructive" className="w-96">
    <AlertTriangle />
    <AlertTitle>Assinatura vencida</AlertTitle>
    <AlertDescription>
      O plano da clínica venceu em 05/08/2026 — regularize para continuar
      emitindo faturas.
    </AlertDescription>
  </Alert>
);
