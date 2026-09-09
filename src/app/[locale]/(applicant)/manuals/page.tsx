import { Suspense } from "react";
import { ManualList, ManualListSkeleton } from "@/components/features/manuals/ManualList";

export default function ManualsPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<ManualListSkeleton />}>
        <ManualList />
      </Suspense>
    </div>
  );
}
