import { Suspense } from "react";
import {
  HelpdeskInquiryList,
  HelpdeskInquiryListSkeleton,
} from "@/components/features/helpdesk-inquiries/HelpdeskInquiryList";

export default function HelpdeskInquiryListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<HelpdeskInquiryListSkeleton />}>
        <HelpdeskInquiryList />
      </Suspense>
    </div>
  );
}
