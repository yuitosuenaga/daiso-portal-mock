import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { LinkForm } from "@/components/features/helpdesk-links/LinkForm";
import { DeleteLinkButton } from "@/components/features/helpdesk-links/DeleteLinkButton";
import { getLinkByIdForHelpdesk } from "@/lib/api/links";
import { getAllLinkCategories } from "@/lib/api/link-categories";
import { toLinkCategoryFormOptions } from "@/lib/link-category-utils";

type HelpdeskLinkEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskLinkEditPage({
  params,
}: HelpdeskLinkEditPageProps) {
  const [t, tListLabels] = await Promise.all([
    getTranslations("helpdeskLinks.form"),
    getTranslations("helpdeskLinks.list"),
  ]);

  const link = await getLinkByIdForHelpdesk(params.id);

  if (!link) {
    return (
      <div className="max-w-2xl space-y-4">
        <BackLink href="/helpdesk/links" label={t("backToList")} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = await getAllLinkCategories();
  const categoryOptions = toLinkCategoryFormOptions(categories);

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/links" label={t("backToList")} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("editTitle")}
        </h1>
        <DeleteLinkButton
          linkId={link.id}
          title={link.title}
          deleteButtonLabel={tListLabels("deleteButton")}
          confirmTitle={tListLabels("deleteConfirmTitle")}
          confirmMessage={tListLabels("deleteConfirm", { title: link.title })}
          confirmButtonLabel={tListLabels("deleteConfirmButton")}
          cancelButtonLabel={tListLabels("deleteCancelButton")}
          errorMessage={tListLabels("deleteError")}
        />
      </div>
      <LinkForm
        mode="edit"
        linkId={link.id}
        defaultValues={{
          title: link.title,
          url: link.url,
          categoryId: link.categoryId ?? "",
          subCategoryId: link.subCategoryId ?? "",
          description: link.description ?? "",
        }}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        urlLabel={t("urlLabel")}
        urlPlaceholder={t("urlPlaceholder")}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
        subCategoryLabel={t("subCategoryLabel")}
        subCategoryPlaceholder={t("subCategoryPlaceholder")}
        subCategoryNoneOption={t("subCategoryNoneOption")}
        descriptionLabel={t("descriptionLabel")}
        descriptionPlaceholder={t("descriptionPlaceholder")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        invalidUrlErrorMessage={t("validation.invalidUrl")}
        submitErrorMessage={t("submitError")}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
