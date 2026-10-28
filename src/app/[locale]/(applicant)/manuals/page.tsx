import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { ManualList, ManualListSkeleton } from "@/components/features/manuals/ManualList";

export const generateMetadata = createPageMetadata("manuals", "list.title");

export default function ManualsPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<ManualListSkeleton />}>
        <ManualList />
      </Suspense>
    </div>
  );
}
