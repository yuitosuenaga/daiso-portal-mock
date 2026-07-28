import { Suspense } from "react";
import {
  DocumentList,
  DocumentListSkeleton,
} from "@/components/features/documents/DocumentList";

interface DocumentCategoryPageProps {
  params: {
    categoryId: string;
  };
}

export default function DocumentCategoryPage({
  params,
}: DocumentCategoryPageProps) {
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentListSkeleton />}>
        <DocumentList categoryId={params.categoryId} />
      </Suspense>
    </div>
  );
}
