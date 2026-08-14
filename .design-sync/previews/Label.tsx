import { Label, Input } from "nixvet-ui";

export const Default = () => (
  <div className="flex flex-col gap-2 w-72">
    <Label htmlFor="tutor-name">Nome do tutor</Label>
    <Input id="tutor-name" placeholder="Ana Souza" />
  </div>
);
