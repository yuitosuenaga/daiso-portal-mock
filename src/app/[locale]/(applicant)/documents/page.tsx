import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  DocumentCategoryList,
  DocumentCategoryListSkeleton,
} from "@/components/features/documents/DocumentCategoryList";

export const generateMetadata = createPageMetadata("documents", "list.title");

export default function DocumentsPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentCategoryListSkeleton />}>
        <DocumentCategoryList />
      </Suspense>
    </div>
  );
}
