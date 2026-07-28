import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getAllDocumentCategories } from "@/lib/api/document-categories";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { DocumentCategoryManagementListClient } from "@/components/features/helpdesk-document-categories/DocumentCategoryManagementListClient";
import { ManagementListMessageCard, ManagementListSkeleton } from "@/components/features/helpdesk-shared/ManagementList";
import type { DocumentCategoryAdminView } from "@/types/document-category";

/**
 * ドキュメントカテゴリ管理画面（`/helpdesk/documents/categories`）のサーバー側。
 * カテゴリ全件・国/販社ラベル辞書・公開範囲ラベルを解決し、見出しと戻る導線を描画する。
 * 「追加」がダイアログ起動のため`ManagementListHeading`は使わず、同等のマークアップを
 * 本コンポーネントで用意する（要件19.1・19.2・19.15）。
 */
export async function DocumentCategoryManagementList() {
  const [t, tCountries] = await Promise.all([
    getTranslations("helpdeskDocumentCategories.list"),
    getTranslations("inquiryForm.options.country"),
  ]);

  const heading = (
    <div className="mb-6 space-y-2">
      <BackLink href="/helpdesk/documents" label={t("backToDocuments")} />
      <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );

  let categories: DocumentCategoryAdminView[];
  try {
    categories = await getAllDocumentCategories();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
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

  const countryLabels = INQUIRY_COUNTRY_CODES.reduce(
    (labels, code) => {
      labels[code] = tCountries(code);
      return labels;
    },
    {} as Record<string, string>
  );

  const companyLabels = DOCUMENT_COMPANY_OPTIONS.reduce(
    (labels, option) => {
      labels[option.code] = `${option.companyName} (${countryLabels[option.country] ?? option.country})`;
      return labels;
    },
    {} as Record<string, string>
  );

  return (
    <div>
      {heading}
      <DocumentCategoryManagementListClient
        categories={categories}
        countryOptions={countryOptions}
        companyOptions={companyOptions}
        targetingLabels={{
          allLabel: t("targetingAllLabel"),
          countriesLabel: t("targetingCountriesLabel"),
          companiesLabel: t("targetingCompaniesLabel"),
          countryLabels,
          companyLabels,
        }}
      />
    </div>
  );
}

export function DocumentCategoryManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
