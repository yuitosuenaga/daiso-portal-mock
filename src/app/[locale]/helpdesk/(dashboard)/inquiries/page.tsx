import { Suspense } from "react";
import {
  HelpdeskInquiryList,
  HelpdeskInquiryListSkeleton,
} from "@/components/features/helpdesk-inquiries/HelpdeskInquiryList";
import type { InquiryListSearchParams } from "@/lib/inquiry-filter-query";

export default function HelpdeskInquiryListPage({
  searchParams,
}: {
  searchParams?: InquiryListSearchParams;
}) {
  return (
    <div className="w-full">
      <Suspense fallback={<HelpdeskInquiryListSkeleton />}>
        <HelpdeskInquiryList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
