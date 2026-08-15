import { Input } from "nixvet-ui";

export const Default = () => (
  <Input placeholder="Nome do tutor" className="w-72" />
);

export const WithValue = () => (
  <Input defaultValue="Ana Souza" className="w-72" />
);

export const Disabled = () => (
  <Input defaultValue="ana.souza@email.com" disabled className="w-72" />
);

export const Invalid = () => (
  <Input defaultValue="" aria-invalid placeholder="CPF do tutor" className="w-72" />
);
