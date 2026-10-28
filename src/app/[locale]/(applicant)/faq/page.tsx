import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { FaqList, FaqListSkeleton } from "@/components/features/faq/FaqList";

export const generateMetadata = createPageMetadata("faq", "list.title");

export default function FaqPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<FaqListSkeleton />}>
        <FaqList />
      </Suspense>
    </div>
  );
}
