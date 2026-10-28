import { createPageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";

import {
  StaffManagementList,
  StaffManagementListSkeleton,
} from "@/components/features/helpdesk-staff/StaffManagementList";
import { requireHelpdeskAdminPage } from "@/lib/server/require-helpdesk-admin-page";

/** スタッフ管理一覧。admin以外には存在自体を見せない（404）。 */
export const generateMetadata = createPageMetadata("helpdeskStaff", "list.title");

export default async function HelpdeskStaffPage() {
  await requireHelpdeskAdminPage();

  return (
    <div className="w-full">
      <Suspense fallback={<StaffManagementListSkeleton />}>
        <StaffManagementList />
      </Suspense>
    </div>
  );
}
