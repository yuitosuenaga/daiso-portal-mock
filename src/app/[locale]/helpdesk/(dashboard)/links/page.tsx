import { Suspense } from "react";
import {
  LinkManagementList,
  LinkManagementListSkeleton,
} from "@/components/features/helpdesk-links/LinkManagementList";

export default function HelpdeskLinksPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<LinkManagementListSkeleton />}>
        <LinkManagementList />
      </Suspense>
    </div>
  );
}
