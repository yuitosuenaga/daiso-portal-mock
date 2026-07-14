import { Suspense } from "react";
import {
  FaqManagementList,
  FaqManagementListSkeleton,
} from "@/components/features/helpdesk-faq/FaqManagementList";

export default function HelpdeskFaqPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<FaqManagementListSkeleton />}>
        <FaqManagementList />
      </Suspense>
    </div>
  );
}
