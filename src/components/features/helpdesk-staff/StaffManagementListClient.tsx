"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  ToggleStaffActiveButton,
  type ToggleStaffActiveButtonLabels,
} from "@/components/features/helpdesk-staff/ToggleStaffActiveButton";
import {
  ToggleStaffRoleButton,
  type ToggleStaffRoleButtonLabels,
} from "@/components/features/helpdesk-staff/ToggleStaffRoleButton";
import type { StaffErrorMessages } from "@/components/features/helpdesk-staff/staff-error-messages";
import type {
  HelpdeskStaffRegistrationSource,
  HelpdeskStaffRole,
  HelpdeskStaffSummary,
} from "@/types/helpdesk-staff";

export interface StaffManagementListClientProps {
  staff: HelpdeskStaffSummary[];
  /** ログイン中のスタッフID。この行は「あなた」表示にし、操作ボタンを無効にする。 */
  currentStaffId: string;
  locale: string;
  headers: {
    email: string;
    displayName: string;
    role: string;
    source: string;
    status: string;
    created: string;
    actions: string;
  };
  youBadge: string;
  roleLabels: Record<HelpdeskStaffRole, string>;
  sourceLabels: Record<HelpdeskStaffRegistrationSource, string>;
  statusLabels: { active: string; inactive: string };
  toggleRoleLabels: ToggleStaffRoleButtonLabels;
  toggleActiveLabels: ToggleStaffActiveButtonLabels;
  errors: StaffErrorMessages;
}

/** スタッフ一覧テーブル（admin専用画面）。各行にロール変更・無効化/再有効化の操作を持つ。 */
export function StaffManagementListClient({
  staff,
  currentStaffId,
  locale,
  headers,
  youBadge,
  roleLabels,
  sourceLabels,
  statusLabels,
  toggleRoleLabels,
  toggleActiveLabels,
  errors,
}: StaffManagementListClientProps) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });

  return (
    <Card>
      <CardContent className="overflow-x-auto pt-6">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{headers.email}</th>
              <th className="py-2 pr-4 font-medium">{headers.displayName}</th>
              <th className="py-2 pr-4 font-medium">{headers.role}</th>
              <th className="py-2 pr-4 font-medium">{headers.source}</th>
              <th className="py-2 pr-4 font-medium">{headers.status}</th>
              <th className="py-2 pr-4 font-medium">{headers.created}</th>
              <th className="py-2 pr-4 font-medium">
                <span className="sr-only">{headers.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((member) => {
              const isSelf = member.id === currentStaffId;
              return (
                <tr key={member.id}>
                  <td className="py-3 pr-4 text-foreground">{member.email}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {member.displayName}
                    {isSelf && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        {youBadge}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {roleLabels[member.role]}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {sourceLabels[member.registrationSource]}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {member.isActive ? statusLabels.active : statusLabels.inactive}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {dateFormatter.format(new Date(member.createdAt))}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <ToggleStaffRoleButton
                        staffId={member.id}
                        staffName={member.displayName}
                        role={member.role}
                        disabled={isSelf}
                        labels={toggleRoleLabels}
                        errors={errors}
                      />
                      <ToggleStaffActiveButton
                        staffId={member.id}
                        staffName={member.displayName}
                        isActive={member.isActive}
                        disabled={isSelf}
                        labels={toggleActiveLabels}
                        errors={errors}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
