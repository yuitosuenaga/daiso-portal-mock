import { Suspense } from "react";
import {
  InquiryDetail,
  InquiryDetailSkeleton,
} from "@/components/features/inquiry-list/InquiryDetail";

type InquiryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InquiryDetailPage(props: InquiryDetailPageProps) {
  const params = await props.params;
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<InquiryDetailSkeleton />}>
        <InquiryDetail id={params.id} />
      </Suspense>
    </div>
  );
}
