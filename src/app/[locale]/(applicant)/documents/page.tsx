import { Suspense } from "react";
import {
  DocumentCategoryList,
  DocumentCategoryListSkeleton,
} from "@/components/features/documents/DocumentCategoryList";

export default function DocumentsPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentCategoryListSkeleton />}>
        <DocumentCategoryList />
      </Suspense>
    </div>
  );
}
