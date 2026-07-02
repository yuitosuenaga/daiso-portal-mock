import { Suspense } from "react";
import {
  HelpdeskInquiryList,
  HelpdeskInquiryListSkeleton,
} from "@/components/features/helpdesk-inquiries/HelpdeskInquiryList";

export default function HelpdeskInquiryListPage() {
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<HelpdeskInquiryListSkeleton />}>
        <HelpdeskInquiryList />
      </Suspense>
    </div>
  );
}
