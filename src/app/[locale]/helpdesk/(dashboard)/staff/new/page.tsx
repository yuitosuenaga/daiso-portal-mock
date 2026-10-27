import { getTranslations } from "next-intl/server";

import { StaffForm } from "@/components/features/helpdesk-staff/StaffForm";
import { BackLink } from "@/components/ui/back-link";
import { requireHelpdeskAdminPage } from "@/lib/server/require-helpdesk-admin-page";

export default async function HelpdeskStaffNewPage() {
  await requireHelpdeskAdminPage();
  const [t, tRole] = await Promise.all([
    getTranslations("helpdeskStaff.form"),
    getTranslations("helpdeskStaff.role"),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/staff" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("createTitle")}
      </h1>
      <StaffForm
        emailLabel={t("emailLabel")}
        emailPlaceholder={t("emailPlaceholder")}
        displayNameLabel={t("displayNameLabel")}
        displayNamePlaceholder={t("displayNamePlaceholder")}
        passwordLabel={t("passwordLabel")}
        passwordPlaceholder={t("passwordPlaceholder")}
        passwordHint={t("passwordHint")}
        roleLabel={t("roleLabel")}
        roleOptions={[
          { value: "member", label: tRole("member") },
          { value: "admin", label: tRole("admin") },
        ]}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        emailInvalidMessage={t("validation.emailInvalid")}
        emailDuplicateMessage={t("validation.emailDuplicate")}
        passwordTooShortMessage={t("validation.passwordTooShort")}
        submitErrorMessage={t("submitError")}
      />
    </div>
  );
}
