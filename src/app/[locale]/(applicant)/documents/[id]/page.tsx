import { Suspense } from "react";
import {
  DocumentDetail,
  DocumentDetailSkeleton,
} from "@/components/features/documents/DocumentDetail";

type DocumentDetailPageProps = {
  params: {
    id: string;
  };
};

export default function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<DocumentDetailSkeleton />}>
        <DocumentDetail id={params.id} />
      </Suspense>
    </div>
  );
}
