import { Suspense } from "react";
import {
  InquiryList,
  InquiryListSkeleton,
} from "@/components/features/inquiry-list/InquiryList";

export default function InquiryListPage() {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<InquiryListSkeleton />}>
        <InquiryList />
      </Suspense>
    </div>
  );
}
