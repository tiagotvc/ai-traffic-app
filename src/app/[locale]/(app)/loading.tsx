import {
  CardsRowSkeleton,
  ChartCardSkeleton,
  Skeleton,
  SupportStripSkeleton,
  TableSkeleton
} from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>
      <CardsRowSkeleton />
      <SupportStripSkeleton />
      <ChartCardSkeleton />
      <TableSkeleton rows={4} columns={["media", "text", "badge", "select", "metric", "metric"]} />
    </div>
  );
}
