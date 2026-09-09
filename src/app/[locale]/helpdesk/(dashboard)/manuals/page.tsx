import { Suspense } from "react";
import {
  ManualManagementList,
  ManualManagementListSkeleton,
} from "@/components/features/helpdesk-manuals/ManualManagementList";

export default function HelpdeskManualListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<ManualManagementListSkeleton />}>
        <ManualManagementList />
      </Suspense>
    </div>
  );
}
