import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { FaqForm } from "@/components/features/helpdesk-faq/FaqForm";
import { DeleteFaqButton } from "@/components/features/helpdesk-faq/DeleteFaqButton";
import { getFaqByIdForHelpdesk } from "@/lib/api/faqs";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";

type HelpdeskFaqEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskFaqEditPage({
  params,
}: HelpdeskFaqEditPageProps) {
  const [t, tListLabels, tCategories] = await Promise.all([
    getTranslations("helpdeskFaq.form"),
    getTranslations("helpdeskFaq.list"),
    getTranslations("faq.categories"),
  ]);

  const faq = await getFaqByIdForHelpdesk(params.id);

  if (!faq) {
    return (
      <div className="max-w-2xl space-y-4">
        <BackLink href="/helpdesk/faq" label={t("backToList")} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryOptions = FAQ_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/faq" label={t("backToList")} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("editTitle")}
        </h1>
        <DeleteFaqButton
          faqId={faq.id}
          deleteButtonLabel={tListLabels("deleteButton")}
          confirmTitle={tListLabels("deleteConfirmTitle")}
          confirmMessage={tListLabels("deleteConfirm", { question: faq.question })}
          confirmButtonLabel={tListLabels("deleteConfirmButton")}
          cancelButtonLabel={tListLabels("deleteCancelButton")}
          errorMessage={tListLabels("deleteError")}
        />
      </div>
      <FaqForm
        mode="edit"
        faqId={faq.id}
        defaultValues={{
          category: faq.category,
          question: faq.question,
          answer: faq.answer,
        }}
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
