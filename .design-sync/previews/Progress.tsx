import { Progress } from "nixvet-ui";

export const Values = () => (
  <div className="flex flex-col gap-3 w-72">
    <Progress value={25} />
    <Progress value={60} />
    <Progress value={90} />
  </div>
);
