import { useState } from "react";
import { CurrencyInput, Label } from "nixvet-ui";

export const Default = () => {
  const [value, setValue] = useState("189.90");
  return (
    <div className="flex flex-col gap-2 w-56">
      <Label htmlFor="consult-price">Valor da consulta</Label>
      <CurrencyInput id="consult-price" value={value} onValueChange={setValue} />
    </div>
  );
};
