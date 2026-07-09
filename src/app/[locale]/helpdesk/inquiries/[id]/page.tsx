import { Suspense } from "react";
import {
  HelpdeskInquiryDetail,
  HelpdeskInquiryDetailSkeleton,
} from "@/components/features/helpdesk-inquiries/HelpdeskInquiryDetail";

type HelpdeskInquiryDetailPageProps = {
  params: {
    id: string;
  };
};

export default function HelpdeskInquiryDetailPage({
  params,
}: HelpdeskInquiryDetailPageProps) {
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<HelpdeskInquiryDetailSkeleton />}>
        <HelpdeskInquiryDetail id={params.id} />
      </Suspense>
    </div>
  );
}
