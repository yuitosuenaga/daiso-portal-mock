import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
    <div className="max-w-xl space-y-4">
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
      <Link
        href="/helpdesk/templates"
        className="inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        {t("backToList")}
      </Link>
    </div>
  );
}
