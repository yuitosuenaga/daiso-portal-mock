import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  DocumentManagementList,
  DocumentManagementListSkeleton,
} from "@/components/features/helpdesk-documents/DocumentManagementList";

export const generateMetadata = createPageMetadata("helpdeskDocuments", "list.title");

export default function HelpdeskDocumentListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<DocumentManagementListSkeleton />}>
        <DocumentManagementList />
      </Suspense>
    </div>
  );
}
