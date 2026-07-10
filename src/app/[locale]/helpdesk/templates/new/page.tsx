import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { TemplateForm } from "@/components/features/helpdesk-templates/TemplateForm";
import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";

export default async function HelpdeskTemplateNewPage() {
  const [t, tCategories] = await Promise.all([
    getTranslations("helpdeskTemplates.form"),
    getTranslations("inquiryForm.options.category"),
  ]);

  const categoryOptions = INQUIRY_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/templates" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("createTitle")}
      </h1>
      <TemplateForm
        mode="create"
        nameLabel={t("nameLabel")}
        namePlaceholder={t("namePlaceholder")}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
        bodyLabel={t("bodyLabel")}
        bodyPlaceholder={t("bodyPlaceholder")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        nameTooLongErrorMessage={t("validation.nameTooLong")}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
