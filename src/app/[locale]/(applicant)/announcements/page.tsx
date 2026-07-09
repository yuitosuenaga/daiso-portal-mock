import { Suspense } from "react";
import {
  AnnouncementList,
  AnnouncementListSkeleton,
} from "@/components/features/announcements/AnnouncementList";

export default function AnnouncementsPage() {
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<AnnouncementListSkeleton />}>
        <AnnouncementList />
      </Suspense>
    </div>
  );
}
