import { Suspense } from "react";
import {
  MonthlyMaterialGallery,
  MonthlyMaterialGallerySkeleton,
} from "@/components/features/monthly-materials/MonthlyMaterialGallery";

export default function HelpdeskPopPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<MonthlyMaterialGallerySkeleton />}>
        <MonthlyMaterialGallery category="pop" editable={true} />
      </Suspense>
    </div>
  );
}
