import { Suspense } from "react";
import {
  MonthlyMaterialGallery,
  MonthlyMaterialGallerySkeleton,
} from "@/components/features/monthly-materials/MonthlyMaterialGallery";

export default function HelpdeskSalesFloorMeetingPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<MonthlyMaterialGallerySkeleton />}>
        <MonthlyMaterialGallery category="salesFloorMeeting" editable={true} />
      </Suspense>
    </div>
  );
}
