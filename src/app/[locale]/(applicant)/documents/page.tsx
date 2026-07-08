import { Suspense } from "react";
import {
  DocumentList,
  DocumentListSkeleton,
} from "@/components/features/documents/DocumentList";

export default function DocumentsPage() {
  return (
    <div className="max-w-3xl">
      <Suspense fallback={<DocumentListSkeleton />}>
        <DocumentList />
      </Suspense>
    </div>
  );
}
