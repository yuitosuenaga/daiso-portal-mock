import { Suspense } from "react";
import {
  DocumentManagementList,
  DocumentManagementListSkeleton,
} from "@/components/features/helpdesk-documents/DocumentManagementList";

export default function HelpdeskDocumentListPage() {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<DocumentManagementListSkeleton />}>
        <DocumentManagementList />
      </Suspense>
    </div>
  );
}
