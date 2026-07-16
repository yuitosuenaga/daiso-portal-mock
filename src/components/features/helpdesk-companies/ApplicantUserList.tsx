import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleApplicantUserActiveButton } from "@/components/features/helpdesk-companies/ToggleApplicantUserActiveButton";
import type { ApplicantUserSummary } from "@/types/applicant-user";

export interface ApplicantUserListProps {
  companyId: string;
  applicantUsers: ApplicantUserSummary[];
  emptyMessage: string;
  emailHeader: string;
  displayNameHeader: string;
  statusHeader: string;
  activeStatusLabel: string;
  inactiveStatusLabel: string;
  editLinkLabel: string;
  deactivateButtonLabel: string;
  activateButtonLabel: string;
  deactivateConfirmMessage: string;
  activateConfirmMessage: string;
  toggleErrorMessage: string;
}

/**
 * 会社詳細画面に表示する申請者アカウント一覧（要件4.2〜4.5）。
 * `listApplicantUsersByCompany`が返す並び順（有効なアカウント優先→表示名昇順）を
 * そのまま表示する、表示専用のコンポーネント。
 */
export function ApplicantUserList({
  companyId,
  applicantUsers,
  emptyMessage,
  emailHeader,
  displayNameHeader,
  statusHeader,
  activeStatusLabel,
  inactiveStatusLabel,
  editLinkLabel,
  deactivateButtonLabel,
  activateButtonLabel,
  deactivateConfirmMessage,
  activateConfirmMessage,
  toggleErrorMessage,
}: ApplicantUserListProps) {
  if (applicantUsers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto pt-6">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{emailHeader}</th>
              <th className="py-2 pr-4 font-medium">{displayNameHeader}</th>
              <th className="py-2 pr-4 font-medium">{statusHeader}</th>
              <th className="py-2 pr-4 font-medium">
                <span className="sr-only">{editLinkLabel}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {applicantUsers.map((applicantUser) => (
              <tr key={applicantUser.id}>
                <td className="py-3 pr-4 font-medium text-foreground">
                  {applicantUser.email}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {applicantUser.displayName}
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={applicantUser.isActive ? "default" : "muted"}>
                    {applicantUser.isActive ? activeStatusLabel : inactiveStatusLabel}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/helpdesk/companies/${companyId}/applicant-users/${applicantUser.id}/edit`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {editLinkLabel}
                    </Link>
                    <ToggleApplicantUserActiveButton
                      applicantUserId={applicantUser.id}
                      isActive={applicantUser.isActive}
                      deactivateButtonLabel={deactivateButtonLabel}
                      activateButtonLabel={activateButtonLabel}
                      deactivateConfirmMessage={deactivateConfirmMessage}
                      activateConfirmMessage={activateConfirmMessage}
                      errorMessage={toggleErrorMessage}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
