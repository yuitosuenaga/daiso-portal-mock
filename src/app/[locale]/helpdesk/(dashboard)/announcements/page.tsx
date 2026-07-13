import { Suspense } from "react";
import {
  AnnouncementManagementList,
  AnnouncementManagementListSkeleton,
} from "@/components/features/helpdesk-announcements/AnnouncementManagementList";

export default function HelpdeskAnnouncementListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<AnnouncementManagementListSkeleton />}>
        <AnnouncementManagementList />
      </Suspense>
    </div>
  );
}
