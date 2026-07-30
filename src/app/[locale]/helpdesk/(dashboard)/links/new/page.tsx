import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { LinkForm } from "@/components/features/helpdesk-links/LinkForm";
import { getAllLinkCategories } from "@/lib/api/link-categories";
import { toLinkCategoryFormOptions } from "@/lib/link-category-utils";

export default async function HelpdeskLinkNewPage() {
  const t = await getTranslations("helpdeskLinks.form");

  const categories = await getAllLinkCategories();
  const categoryOptions = toLinkCategoryFormOptions(categories);

  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/helpdesk/links" label={t("backToList")} />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("createTitle")}
      </h1>
      <LinkForm
        mode="create"
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
