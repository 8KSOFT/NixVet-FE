import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "nixvet-ui";

export const Default = () => (
  <Accordion type="single" collapsible defaultValue="item-1" className="w-96">
    <AccordionItem value="item-1">
      <AccordionTrigger>Dados do tutor</AccordionTrigger>
      <AccordionContent>
        Ana Souza — CPF 123.456.789-00 — (11) 98888-7777
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
      <AccordionTrigger>Histórico de vacinas</AccordionTrigger>
      <AccordionContent>
        Antirrábica em 10/02/2026, V10 em 15/01/2026.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-3">
      <AccordionTrigger>Faturamento</AccordionTrigger>
      <AccordionContent>Nenhuma fatura em aberto.</AccordionContent>
    </AccordionItem>
  </Accordion>
);
