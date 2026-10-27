import { Suspense } from "react";
import {
  AnnouncementDetail,
  AnnouncementDetailSkeleton,
} from "@/components/features/announcements/AnnouncementDetail";

type AnnouncementDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AnnouncementDetailPage(props: AnnouncementDetailPageProps) {
  const params = await props.params;
  return (
    <div className="max-w-5xl">
      <Suspense fallback={<AnnouncementDetailSkeleton />}>
        <AnnouncementDetail id={params.id} />
      </Suspense>
    </div>
  );
}
