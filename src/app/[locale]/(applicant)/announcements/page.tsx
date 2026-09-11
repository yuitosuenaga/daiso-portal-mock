import { Suspense } from "react";
import {
  AnnouncementList,
  AnnouncementListSkeleton,
} from "@/components/features/announcements/AnnouncementList";
import {
  AnnouncementSelfSummaryPanel,
  AnnouncementSelfSummaryPanelSkeleton,
} from "@/components/features/dashboard/AnnouncementSelfSummaryPanel";

export default function AnnouncementsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
        <Suspense fallback={<AnnouncementListSkeleton />}>
          <AnnouncementList />
        </Suspense>
      </div>
      <div className="lg:col-start-3 lg:row-start-1">
        <Suspense fallback={<AnnouncementSelfSummaryPanelSkeleton />}>
          <AnnouncementSelfSummaryPanel />
        </Suspense>
      </div>
    </div>
  );
}
