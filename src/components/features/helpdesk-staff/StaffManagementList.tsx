import { getLocale, getTranslations } from "next-intl/server";

import {
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import { StaffManagementListClient } from "@/components/features/helpdesk-staff/StaffManagementListClient";
import { requireHelpdeskAdminSession } from "@/lib/server/auth-session";
import { listHelpdeskStaff } from "@/lib/server/helpdesk-staff-service";
import type { HelpdeskStaffSummary } from "@/types/helpdesk-staff";

/** スタッフ管理一覧（admin専用）。取得失敗・0件時のメッセージ表示を含む。 */
export async function StaffManagementList() {
  const [t, tToggle, tRole, tSource, tStatus, tErrors, locale, session] =
    await Promise.all([
      getTranslations("helpdeskStaff.list"),
      getTranslations("helpdeskStaff.toggle"),
      getTranslations("helpdeskStaff.role"),
      getTranslations("helpdeskStaff.source"),
      getTranslations("helpdeskStaff.status"),
      getTranslations("helpdeskStaff.errors"),
      getLocale(),
      requireHelpdeskAdminSession(),
    ]);

  const heading = (
    <ManagementListHeading
      title={t("title")}
      description={t("description")}
      addHref="/helpdesk/staff/new"
      addLabel={t("addButton")}
    />
  );

  let staff: HelpdeskStaffSummary[];
  try {
    staff = await listHelpdeskStaff();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("empty")} />
      </div>
    );
  }

  return (
    <div>
      {heading}
      <StaffManagementListClient
        staff={staff}
        currentStaffId={session.claims.staffId}
        locale={locale}
        headers={{
          email: t("emailHeader"),
          displayName: t("displayNameHeader"),
          role: t("roleHeader"),
          source: t("sourceHeader"),
          status: t("statusHeader"),
          created: t("createdHeader"),
          actions: t("actionsHeader"),
        }}
        youBadge={t("youBadge")}
        roleLabels={{ admin: tRole("admin"), member: tRole("member") }}
        sourceLabels={{
          seed: tSource("seed"),
          manual: tSource("manual"),
          google_auto: tSource("google_auto"),
        }}
        statusLabels={{ active: tStatus("active"), inactive: tStatus("inactive") }}
        toggleRoleLabels={{
          promoteButton: tToggle("promoteButton"),
          demoteButton: tToggle("demoteButton"),
          promoteConfirmTitle: tToggle("promoteConfirmTitle"),
          demoteConfirmTitle: tToggle("demoteConfirmTitle"),
          promoteConfirm: tToggle("promoteConfirm"),
          demoteConfirm: tToggle("demoteConfirm"),
          promoteConfirmButton: tToggle("promoteConfirmButton"),
          demoteConfirmButton: tToggle("demoteConfirmButton"),
          cancelButton: tToggle("cancelButton"),
        }}
        toggleActiveLabels={{
          deactivateButton: tToggle("deactivateButton"),
          activateButton: tToggle("activateButton"),
          deactivateConfirmTitle: tToggle("deactivateConfirmTitle"),
          activateConfirmTitle: tToggle("activateConfirmTitle"),
          deactivateConfirm: tToggle("deactivateConfirm"),
          activateConfirm: tToggle("activateConfirm"),
          deactivateConfirmButton: tToggle("deactivateConfirmButton"),
          activateConfirmButton: tToggle("activateConfirmButton"),
          cancelButton: tToggle("cancelButton"),
        }}
        errors={{
          self: tErrors("self"),
          lastAdmin: tErrors("lastAdmin"),
          notFound: tErrors("notFound"),
          invalid: tErrors("invalid"),
          generic: tErrors("generic"),
        }}
      />
    </div>
  );
}

export function StaffManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
