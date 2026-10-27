import { Suspense } from "react";

import {
  StaffManagementList,
  StaffManagementListSkeleton,
} from "@/components/features/helpdesk-staff/StaffManagementList";
import { requireHelpdeskAdminPage } from "@/lib/server/require-helpdesk-admin-page";

/** スタッフ管理一覧。admin以外には存在自体を見せない（404）。 */
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
