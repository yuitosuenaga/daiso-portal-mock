import { Suspense } from "react";
import {
  AnnouncementManagementList,
  AnnouncementManagementListSkeleton,
} from "@/components/features/helpdesk-announcements/AnnouncementManagementList";

export default function HelpdeskAnnouncementListPage() {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<AnnouncementManagementListSkeleton />}>
        <AnnouncementManagementList />
      </Suspense>
    </div>
  );
}
