import { Suspense } from "react";
import { FaqList, FaqListSkeleton } from "@/components/features/faq/FaqList";

export default function FaqPage() {
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<FaqListSkeleton />}>
        <FaqList />
      </Suspense>
    </div>
  );
}
