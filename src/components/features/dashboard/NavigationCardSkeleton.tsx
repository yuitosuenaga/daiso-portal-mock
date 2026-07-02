import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NavigationCardSkeleton() {
  return (
    <Card className="h-full" aria-hidden="true">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
