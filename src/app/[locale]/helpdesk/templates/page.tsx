import { Suspense } from "react";
import {
  TemplateList,
  TemplateListSkeleton,
} from "@/components/features/helpdesk-templates/TemplateList";

export default function HelpdeskTemplateListPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<TemplateListSkeleton />}>
        <TemplateList />
      </Suspense>
    </div>
  );
}
