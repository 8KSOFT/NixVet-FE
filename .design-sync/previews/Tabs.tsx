import { Tabs, TabsList, TabsTrigger, TabsContent } from "nixvet-ui";

export const Default = () => (
  <Tabs defaultValue="record" className="w-96">
    <TabsList>
      <TabsTrigger value="record">Prontuário</TabsTrigger>
      <TabsTrigger value="vaccines">Vacinas</TabsTrigger>
      <TabsTrigger value="billing">Financeiro</TabsTrigger>
    </TabsList>
    <TabsContent value="record" className="text-sm text-muted-foreground">
      Histórico clínico completo do paciente, incluindo consultas e exames.
    </TabsContent>
    <TabsContent value="vaccines" className="text-sm text-muted-foreground">
      Antirrábica aplicada em 10/02/2026 — próxima dose em 10/02/2027.
    </TabsContent>
    <TabsContent value="billing" className="text-sm text-muted-foreground">
      Nenhuma fatura em aberto para este tutor.
    </TabsContent>
  </Tabs>
);

export const LineVariant = () => (
  <Tabs defaultValue="record" className="w-96">
    <TabsList variant="line">
      <TabsTrigger value="record">Prontuário</TabsTrigger>
      <TabsTrigger value="vaccines">Vacinas</TabsTrigger>
    </TabsList>
    <TabsContent value="record" className="text-sm text-muted-foreground">
      Histórico clínico completo do paciente.
    </TabsContent>
    <TabsContent value="vaccines" className="text-sm text-muted-foreground">
      Carteira de vacinação digital.
    </TabsContent>
  </Tabs>
);
