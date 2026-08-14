import { ScrollArea } from "nixvet-ui";

const pets = [
  "Rex — Labrador",
  "Mel — Gato SRD",
  "Thor — Bulldog Francês",
  "Luna — Poodle",
  "Bidu — Vira-lata",
  "Nina — Siamês",
  "Max — Golden Retriever",
  "Amora — Shih Tzu",
];

export const Default = () => (
  <ScrollArea className="h-48 w-64 rounded-md border p-3">
    <div className="flex flex-col gap-2 text-sm">
      {pets.map((p) => (
        <div key={p}>{p}</div>
      ))}
    </div>
  </ScrollArea>
);
