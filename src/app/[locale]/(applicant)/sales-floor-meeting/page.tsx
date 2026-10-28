import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  MonthlyMaterialGallery,
  MonthlyMaterialGallerySkeleton,
} from "@/components/features/monthly-materials/MonthlyMaterialGallery";

export const generateMetadata = createPageMetadata("monthlyMaterials", "salesFloorMeeting.pageTitle");

export default function SalesFloorMeetingPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<MonthlyMaterialGallerySkeleton />}>
        <MonthlyMaterialGallery category="salesFloorMeeting" editable={false} />
      </Suspense>
    </div>
  );
}
