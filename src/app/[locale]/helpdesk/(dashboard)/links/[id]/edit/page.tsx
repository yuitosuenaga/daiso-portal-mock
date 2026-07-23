import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { LinkForm } from "@/components/features/helpdesk-links/LinkForm";
import { DeleteLinkButton } from "@/components/features/helpdesk-links/DeleteLinkButton";
import { getLinkByIdForHelpdesk } from "@/lib/api/links";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";

type HelpdeskLinkEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskLinkEditPage({
  params,
}: HelpdeskLinkEditPageProps) {
  const [t, tListLabels, tCategories] = await Promise.all([
    getTranslations("helpdeskLinks.form"),
    getTranslations("helpdeskLinks.list"),
    getTranslations("links.categories"),
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

  const categoryOptions = LINK_CATEGORY_CODES.map((code) => ({
    value: code,
    label: tCategories(code),
  }));

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
          category: link.category,
          description: link.description ?? "",
        }}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        urlLabel={t("urlLabel")}
        urlPlaceholder={t("urlPlaceholder")}
        categoryLabel={t("categoryLabel")}
        categoryPlaceholder={t("categoryPlaceholder")}
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
