import { Suspense } from "react";
import {
  LinkCategoryManagementList,
  LinkCategoryManagementListSkeleton,
} from "@/components/features/helpdesk-links/LinkCategoryManagementList";

export default function HelpdeskLinkCategoryListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<LinkCategoryManagementListSkeleton />}>
        <LinkCategoryManagementList />
      </Suspense>
    </div>
  );
}
