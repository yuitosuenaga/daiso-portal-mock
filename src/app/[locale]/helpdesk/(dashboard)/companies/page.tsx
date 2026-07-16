import { Suspense } from "react";
import {
  CompanyManagementList,
  CompanyManagementListSkeleton,
} from "@/components/features/helpdesk-companies/CompanyManagementList";

export default function HelpdeskCompaniesPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<CompanyManagementListSkeleton />}>
        <CompanyManagementList />
      </Suspense>
    </div>
  );
}
