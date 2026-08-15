import { RadioGroup, RadioGroupItem, Label } from "nixvet-ui";

export const Default = () => (
  <RadioGroup defaultValue="dog" className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <RadioGroupItem value="dog" id="species-dog" />
      <Label htmlFor="species-dog">Cão</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="cat" id="species-cat" />
      <Label htmlFor="species-cat">Gato</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="other" id="species-other" disabled />
      <Label htmlFor="species-other">Outro (indisponível)</Label>
    </div>
  </RadioGroup>
);
