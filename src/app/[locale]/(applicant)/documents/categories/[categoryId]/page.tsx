import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  DocumentList,
  DocumentListSkeleton,
} from "@/components/features/documents/DocumentList";

interface DocumentCategoryPageProps {
  params: Promise<{
    categoryId: string;
  }>;
}

export const generateMetadata = createPageMetadata("documents", "list.title");

export default async function DocumentCategoryPage(props: DocumentCategoryPageProps) {
  const params = await props.params;
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentListSkeleton />}>
        <DocumentList categoryId={params.categoryId} />
      </Suspense>
    </div>
  );
}
