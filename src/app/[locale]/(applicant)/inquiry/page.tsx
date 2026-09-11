import { Suspense } from "react";
import {
  InquiryList,
  InquiryListSkeleton,
} from "@/components/features/inquiry-list/InquiryList";
import type { InquiryListSearchParams } from "@/lib/inquiry-filter-query";

export default function InquiryListPage({
  searchParams,
}: {
  searchParams?: InquiryListSearchParams;
}) {
  return (
    <div className="max-w-6xl">
      <Suspense fallback={<InquiryListSkeleton />}>
        <InquiryList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
