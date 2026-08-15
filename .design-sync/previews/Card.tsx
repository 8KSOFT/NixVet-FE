import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from "nixvet-ui";

export const Default = () => (
  <Card className="w-80">
    <CardHeader>
      <CardTitle>Rex</CardTitle>
      <CardDescription>Labrador · 4 anos · Tutor: Ana Souza</CardDescription>
      <CardAction>
        <Badge variant="veterinarian">Em atendimento</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Última consulta em 12/03/2026 — vacinação antirrábica em dia.
      </p>
    </CardContent>
    <CardFooter className="gap-2">
      <Button variant="outline">Ver prontuário</Button>
      <Button>Agendar retorno</Button>
    </CardFooter>
  </Card>
);

export const Simple = () => (
  <Card className="w-72">
    <CardHeader>
      <CardTitle>Faturamento do mês</CardTitle>
      <CardDescription>Agosto de 2026</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-semibold text-foreground">R$ 18.420,00</p>
    </CardContent>
  </Card>
);
