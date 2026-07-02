import { Suspense } from "react";
import {
  InquiryDetail,
  InquiryDetailSkeleton,
} from "@/components/features/inquiry-list/InquiryDetail";

type InquiryDetailPageProps = {
  params: {
    id: string;
  };
};

export default function InquiryDetailPage({
  params,
}: InquiryDetailPageProps) {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<InquiryDetailSkeleton />}>
        <InquiryDetail id={params.id} />
      </Suspense>
    </div>
  );
}
