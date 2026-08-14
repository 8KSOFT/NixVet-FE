import { useState } from "react";
import { Calendar } from "nixvet-ui";

export const Default = () => {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 7, 20));
  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-md border"
    />
  );
};
