import { Suspense } from "react";
import {
  HelpdeskInquiryList,
  HelpdeskInquiryListSkeleton,
} from "@/components/features/helpdesk-inquiries/HelpdeskInquiryList";
import type { InquiryListSearchParams } from "@/lib/inquiry-filter-query";

export default async function HelpdeskInquiryListPage(
  props: {
    searchParams?: Promise<InquiryListSearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <div className="w-full">
      <Suspense fallback={<HelpdeskInquiryListSkeleton />}>
        <HelpdeskInquiryList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
