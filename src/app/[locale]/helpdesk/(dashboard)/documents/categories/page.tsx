import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  DocumentCategoryManagementList,
  DocumentCategoryManagementListSkeleton,
} from "@/components/features/helpdesk-document-categories/DocumentCategoryManagementList";

export const generateMetadata = createPageMetadata("helpdeskDocumentCategories", "list.title");

export default function HelpdeskDocumentCategoryListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentCategoryManagementListSkeleton />}>
        <DocumentCategoryManagementList />
      </Suspense>
    </div>
  );
}
