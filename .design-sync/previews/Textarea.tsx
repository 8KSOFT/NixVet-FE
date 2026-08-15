import { Textarea } from "nixvet-ui";

export const Default = () => (
  <Textarea placeholder="Observações clínicas" className="w-80" />
);

export const WithValue = () => (
  <Textarea
    className="w-80"
    defaultValue={"Paciente apresentou leve claudicação no membro traseiro direito.\nRecomendado repouso por 7 dias."}
  />
);
