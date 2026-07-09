import { Suspense } from "react";
import {
  AnnouncementDetail,
  AnnouncementDetailSkeleton,
} from "@/components/features/announcements/AnnouncementDetail";

type AnnouncementDetailPageProps = {
  params: {
    id: string;
  };
};

export default function AnnouncementDetailPage({
  params,
}: AnnouncementDetailPageProps) {
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<AnnouncementDetailSkeleton />}>
        <AnnouncementDetail id={params.id} />
      </Suspense>
    </div>
  );
}
