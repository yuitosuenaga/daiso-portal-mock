import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { FaqForm } from "@/components/features/helpdesk-faq/FaqForm";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";

export default async function HelpdeskFaqNewPage() {
  const [t, tCategories] = await Promise.all([
    getTranslations("helpdeskFaq.form"),
    getTranslations("faq.categories"),
  ]);

  const categoryOptions = FAQ_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/faq" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("createTitle")}
      </h1>
      <FaqForm
        mode="create"
        questionLabel={t("questionLabel")}
        questionPlaceholder={t("questionPlaceholder")}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
        answerLabel={t("answerLabel")}
        answerPlaceholder={t("answerPlaceholder")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        submitErrorMessage={t("submitError")}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
