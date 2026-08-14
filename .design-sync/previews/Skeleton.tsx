import { Skeleton } from "nixvet-ui";

export const CardRow = () => (
  <div className="flex items-center gap-3 w-72">
    <Skeleton className="size-10 rounded-full" />
    <div className="flex flex-1 flex-col gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);
