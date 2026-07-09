import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { AnnouncementForm } from "@/components/features/helpdesk-announcements/AnnouncementForm";
import { DeleteAnnouncementButton } from "@/components/features/helpdesk-announcements/DeleteAnnouncementButton";
import { getAnnouncementByIdForHelpdesk } from "@/lib/api/announcements";
import { ANNOUNCEMENT_CATEGORY_CODES } from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import type { AnnouncementFormValues } from "@/lib/validation/announcement";

type HelpdeskAnnouncementEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskAnnouncementEditPage({
  params,
}: HelpdeskAnnouncementEditPageProps) {
  const [t, tListLabels, tCategories, tCountries, tInquiryForm] =
    await Promise.all([
      getTranslations("helpdeskAnnouncements.form"),
      getTranslations("helpdeskAnnouncements.list"),
      getTranslations("announcements.categories"),
      getTranslations("inquiryForm.options.country"),
      getTranslations("inquiryForm"),
    ]);

  const backToListLink = (
    <Link
      href="/helpdesk/announcements"
      className="inline-block text-sm text-primary underline-offset-4 hover:underline"
    >
      {t("backToList")}
    </Link>
  );

  const announcement = await getAnnouncementByIdForHelpdesk(params.id);

  if (!announcement) {
    return (
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
        {backToListLink}
      </div>
    );
  }

  const categoryOptions = ANNOUNCEMENT_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("editTitle")}
        </h1>
        <DeleteAnnouncementButton
          announcementId={announcement.id}
          deleteButtonLabel={tListLabels("deleteButton")}
          confirmMessage={tListLabels("deleteConfirm")}
          errorMessage={tListLabels("deleteError")}
        />
      </div>
      <AnnouncementForm
        mode="edit"
        announcementId={announcement.id}
        defaultValues={{
          title: announcement.title,
          body: announcement.body,
          category: announcement.category,
          // `Announcement.targeting.countries`はドメイン型として`string[]`だが、
          // 保存済みデータは常に`announcementFormSchema`で検証済みのため、
          // フォームの厳密な国コード型へ安全に絞り込める。
          targeting: announcement.targeting as AnnouncementFormValues["targeting"],
          actionRequired: announcement.actionRequired,
          publishStartDate: announcement.publishStartDate ?? "",
          publishEndDate: announcement.publishEndDate ?? "",
          dueDate: announcement.dueDate ?? "",
        }}
        categoryOptions={categoryOptions}
        countryOptions={countryOptions}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        bodyLabel={t("bodyLabel")}
        bodyPlaceholder={t("bodyPlaceholder")}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
        actionRequiredLabel={t("actionRequiredLabel")}
        actionRequiredTrueOption={t("actionRequiredTrueOption")}
        actionRequiredFalseOption={t("actionRequiredFalseOption")}
        targetingLabel={t("targetingLabel")}
        targetingAllOption={t("targetingAllOption")}
        targetingCountriesOption={t("targetingCountriesOption")}
        countriesLabel={t("countriesLabel")}
        publishStartDateLabel={t("publishStartDateLabel")}
        publishEndDateLabel={t("publishEndDateLabel")}
        publishPeriodHint={t("publishPeriodHint")}
        publishEndDateBeforeStartErrorMessage={t("validation.publishEndDateBeforeStart")}
        dueDateLabel={t("dueDateLabel")}
        dueDateRequiredErrorMessage={t("validation.dueDateRequired")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        countriesRequiredErrorMessage={t("validation.countriesRequired")}
        requiredIndicator={tInquiryForm("requiredMark")}
        submitErrorMessage={t("submitError")}
      />
      {backToListLink}
    </div>
  );
}
