import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  HelpdeskInquiryDetail,
  HelpdeskInquiryDetailSkeleton,
} from "@/components/features/helpdesk-inquiries/HelpdeskInquiryDetail";

type HelpdeskInquiryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const generateMetadata = createPageMetadata("helpdeskInquiries", "list.title");

export default async function HelpdeskInquiryDetailPage(props: HelpdeskInquiryDetailPageProps) {
  const params = await props.params;
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<HelpdeskInquiryDetailSkeleton />}>
        <HelpdeskInquiryDetail id={params.id} />
      </Suspense>
    </div>
  );
}
