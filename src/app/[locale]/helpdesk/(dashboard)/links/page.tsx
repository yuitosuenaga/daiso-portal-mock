import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  LinkManagementList,
  LinkManagementListSkeleton,
} from "@/components/features/helpdesk-links/LinkManagementList";

export const generateMetadata = createPageMetadata("helpdeskLinks", "list.title");

export default function HelpdeskLinksPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<LinkManagementListSkeleton />}>
        <LinkManagementList />
      </Suspense>
    </div>
  );
}
