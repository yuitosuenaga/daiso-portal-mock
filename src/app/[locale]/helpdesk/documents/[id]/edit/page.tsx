import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { DocumentForm } from "@/components/features/helpdesk-documents/DocumentForm";
import { DeleteDocumentButton } from "@/components/features/helpdesk-documents/DeleteDocumentButton";
import { getDocumentByIdForHelpdesk } from "@/lib/api/documents";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import type { DocumentFormValues } from "@/lib/validation/document";

type HelpdeskDocumentEditPageProps = {
  params: {
    id: string;
  };
};

export default async function HelpdeskDocumentEditPage({
  params,
}: HelpdeskDocumentEditPageProps) {
  const [t, tListLabels, tCountries, tInquiryForm] = await Promise.all([
    getTranslations("helpdeskDocuments.form"),
    getTranslations("helpdeskDocuments.list"),
    getTranslations("inquiryForm.options.country"),
    getTranslations("inquiryForm"),
  ]);

  const backToListLink = (
    <Link
      href="/helpdesk/documents"
      className="inline-block text-sm text-primary underline-offset-4 hover:underline"
    >
      {t("backToList")}
    </Link>
  );

  const document = await getDocumentByIdForHelpdesk(params.id);

  if (!document) {
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

  const countryOptions = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));

  const companyOptions = DOCUMENT_COMPANY_OPTIONS.map((option) => ({
    value: option.code,
    label: `${tCountries(option.country)} - ${option.companyName}`,
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("editTitle")}
        </h1>
        <DeleteDocumentButton
          documentId={document.id}
          deleteButtonLabel={tListLabels("deleteButton")}
          confirmMessage={tListLabels("deleteConfirm")}
          errorMessage={tListLabels("deleteError")}
        />
      </div>
      <DocumentForm
        mode="edit"
        documentId={document.id}
        defaultValues={{
          title: document.title,
          description: document.description ?? "",
          fileName: document.fileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          dataUrl: document.dataUrl,
          // `Document.targeting`はドメイン型として`string[]`だが、保存済みデータは常に
          // `documentFormSchema`で検証済みのため、フォームの厳密な型へ安全に絞り込める。
          targeting: document.targeting as DocumentFormValues["targeting"],
        }}
        countryOptions={countryOptions}
        companyOptions={companyOptions}
        titleLabel={t("titleLabel")}
        titlePlaceholder={t("titlePlaceholder")}
        descriptionLabel={t("descriptionLabel")}
        descriptionPlaceholder={t("descriptionPlaceholder")}
        targetingLabel={t("targetingLabel")}
        targetingAllOption={t("targetingAllOption")}
        targetingCountriesOption={t("targetingCountriesOption")}
        targetingCompaniesOption={t("targetingCompaniesOption")}
        countriesLabel={t("countriesLabel")}
        companiesLabel={t("companiesLabel")}
        fileLabel={t("fileLabel")}
        fileHint={t("fileHint")}
        removeFileButtonLabel={t("removeButtonLabel")}
        submitButtonLabel={t("submitButton")}
        requiredErrorMessage={t("validation.required")}
        countriesRequiredErrorMessage={t("validation.countriesRequired")}
        companiesRequiredErrorMessage={t("validation.companiesRequired")}
        fileRequiredErrorMessage={t("validation.fileRequired")}
        sizeExceededMessage={t("validation.sizeExceeded")}
        typeNotAllowedMessage={t("validation.typeNotAllowed")}
        readFailedMessage={t("validation.readFailed")}
        requiredIndicator={tInquiryForm("requiredMark")}
        submitErrorMessage={t("submitError")}
      />
      {backToListLink}
    </div>
  );
}
