import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { TemplateForm } from "@/components/features/helpdesk-templates/TemplateForm";
import { getReplyTemplateById } from "@/lib/api/reply-templates";
import { INQUIRY_CATEGORY_CODES } from "@/lib/constants/inquiry-options";

type HelpdeskTemplateEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskTemplateEditPage({
  params,
}: HelpdeskTemplateEditPageProps) {
  const [t, tCategories] = await Promise.all([
    getTranslations("helpdeskTemplates.form"),
    getTranslations("inquiryForm.options.category"),
  ]);

  const template = await getReplyTemplateById(params.id);

  if (!template) {
    return (
      <div className="max-w-xl space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
        <Link
          href="/helpdesk/templates"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          {t("backToList")}
        </Link>
      </div>
    );
  }

  const categoryOptions = INQUIRY_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("editTitle")}
      </h1>
      <TemplateForm
        mode="edit"
        templateId={template.id}
        defaultValues={{ category: template.category, body: template.body }}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
        bodyLabel={t("bodyLabel")}
        bodyPlaceholder={t("bodyPlaceholder")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
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
