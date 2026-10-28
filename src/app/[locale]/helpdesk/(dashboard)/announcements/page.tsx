import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  AnnouncementManagementList,
  AnnouncementManagementListSkeleton,
} from "@/components/features/helpdesk-announcements/AnnouncementManagementList";

export const generateMetadata = createPageMetadata("helpdeskAnnouncements", "list.title");

export default function HelpdeskAnnouncementListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<AnnouncementManagementListSkeleton />}>
        <AnnouncementManagementList />
      </Suspense>
    </div>
  );
}
