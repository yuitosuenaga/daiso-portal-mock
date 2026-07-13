import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { AnnouncementForm } from "@/components/features/helpdesk-announcements/AnnouncementForm";
import {
  ANNOUNCEMENT_CATEGORY_CODES,
} from "@/lib/constants/announcement-options";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";

export default async function HelpdeskAnnouncementNewPage() {
  const [t, tCategories, tCountries, tInquiryForm] = await Promise.all([
    getTranslations("helpdeskAnnouncements.form"),
    getTranslations("announcements.categories"),
    getTranslations("inquiryForm.options.country"),
    getTranslations("inquiryForm"),
  ]);

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
      <BackLink href="/helpdesk/announcements" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("createTitle")}
      </h1>
      <AnnouncementForm
        mode="create"
        categoryOptions={categoryOptions}
        countryOptions={countryOptions}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        bodyLabel={t("bodyLabel")}
        bodyPlaceholder={t("bodyPlaceholder")}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
        statusLabel={t("statusLabel")}
        statusDraftOption={t("statusDraftOption")}
        statusPublishedOption={t("statusPublishedOption")}
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
    </div>
  );
}
