import { Suspense } from "react";
import {
  DocumentCategoryManagementList,
  DocumentCategoryManagementListSkeleton,
} from "@/components/features/helpdesk-document-categories/DocumentCategoryManagementList";

export default function HelpdeskDocumentCategoryListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentCategoryManagementListSkeleton />}>
        <DocumentCategoryManagementList />
      </Suspense>
    </div>
  );
}
