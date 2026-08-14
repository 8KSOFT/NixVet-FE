import { Checkbox, Label } from "nixvet-ui";

export const States = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <Checkbox id="vaccine-rabies" defaultChecked />
      <Label htmlFor="vaccine-rabies">Antirrábica aplicada</Label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="vaccine-v10" />
      <Label htmlFor="vaccine-v10">V10 aplicada</Label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="vaccine-disabled" disabled />
      <Label htmlFor="vaccine-disabled">Giárdia (indisponível)</Label>
    </div>
  </div>
);
