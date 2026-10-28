import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import {
  FaqManagementList,
  FaqManagementListSkeleton,
} from "@/components/features/helpdesk-faq/FaqManagementList";

export const generateMetadata = createPageMetadata("helpdeskFaq", "list.title");

export default function HelpdeskFaqPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<FaqManagementListSkeleton />}>
        <FaqManagementList />
      </Suspense>
    </div>
  );
}
