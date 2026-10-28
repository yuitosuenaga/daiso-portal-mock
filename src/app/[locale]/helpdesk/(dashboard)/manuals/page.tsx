import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  ManualManagementList,
  ManualManagementListSkeleton,
} from "@/components/features/helpdesk-manuals/ManualManagementList";

export const generateMetadata = createPageMetadata("helpdeskManuals", "list.title");

export default function HelpdeskManualListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<ManualManagementListSkeleton />}>
        <ManualManagementList />
      </Suspense>
    </div>
  );
}
