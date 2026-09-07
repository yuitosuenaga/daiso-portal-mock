import { getTranslations, getLocale } from "next-intl/server";

import {
  getAllMonthlyMaterialsForHelpdesk,
  getMonthlyMaterials,
} from "@/lib/api/monthly-materials";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddMonthlyMaterialButton } from "@/components/features/monthly-materials/AddMonthlyMaterialButton";
import { MonthlyMaterialSection } from "@/components/features/monthly-materials/MonthlyMaterialSection";
import type { SelectOption } from "@/components/ui/select";
import type { MonthlyMaterial, MonthlyMaterialCategory } from "@/types/monthly-material";

export interface MonthlyMaterialGalleryProps {
  category: MonthlyMaterialCategory;
  /** ヘルプデスク側（編集可能な文脈）かどうか。 */
  editable: boolean;
}

function formatHeading(locale: string, year: number, month: number): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function buildMonthOptions(locale: string): SelectOption[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return { value: String(month), label: formatter.format(new Date(Date.UTC(2000, index, 1))) };
  });
}

/**
 * 月次資料（売場検討会・POP）の一覧表示。海外販社側・ヘルプデスク側どちらからも呼び出せる
 * 共通のServer Component。`editable`に応じて可視性フィルタ済み一覧（海外側）と全件（ヘルプデスク側）を
 * 取得先ごと切り替え、登録済みの年月のみを新しい順に`MonthlyMaterialSection`として並べる。
 */
export async function MonthlyMaterialGallery({
  category,
  editable,
}: MonthlyMaterialGalleryProps) {
  const [t, tCountries, locale] = await Promise.all([
    getTranslations("monthlyMaterials"),
    getTranslations("inquiryForm.options.country"),
    getLocale(),
  ]);

  let materials: MonthlyMaterial[];
  try {
    materials = editable
      ? await getAllMonthlyMaterialsForHelpdesk(category)
      : await getMonthlyMaterials(category);
  } catch {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("list.error")}</p>
        </CardContent>
      </Card>
    );
  }

  const countryOptions: SelectOption[] = INQUIRY_COUNTRY_CODES.map((code) => ({
    value: code,
    label: tCountries(code),
  }));
  const companyOptions: SelectOption[] = DOCUMENT_COMPANY_OPTIONS.map((option) => ({
    value: option.code,
    label: `${tCountries(option.country)} - ${option.companyName}`,
  }));
  const monthOptions = buildMonthOptions(locale);

  const viewerLabels = {
    downloadLinkLabel: t("list.downloadLink"),
    openOriginalLinkLabel: t("list.openOriginalLink"),
    googlePreviewErrorMessage: t("list.googlePreviewError"),
    googlePreviewHint: t("list.googlePreviewHint"),
  };

  const formLabels = {
    countryOptions,
    companyOptions,
    yearLabel: t("form.yearLabel"),
    monthLabel: t("form.monthLabel"),
    monthOptions,
    sourceTypeLabel: t("form.sourceTypeLabel"),
    sourceTypeUploadOption: t("form.sourceTypeUploadOption"),
    sourceTypeGoogleOption: t("form.sourceTypeGoogleOption"),
    fileLabel: t("form.fileLabel"),
    fileHint: t("form.fileHint"),
    removeFileButtonLabel: t("form.removeFileButtonLabel"),
    googleUrlLabel: t("form.googleUrlLabel"),
    googleUrlPlaceholder: t("form.googleUrlPlaceholder"),
    googleUrlHint: t("form.googleUrlHint"),
    targetingLabel: t("form.targetingLabel"),
    targetingAllOption: t("form.targetingAllOption"),
    targetingCountriesOption: t("form.targetingCountriesOption"),
    targetingCompaniesOption: t("form.targetingCompaniesOption"),
    countriesLabel: t("form.countriesLabel"),
    companiesLabel: t("form.companiesLabel"),
    submitButtonLabel: t("form.submitButton"),
    cancelButtonLabel: t("form.cancelButton"),
    requiredErrorMessage: t("form.requiredError"),
    countriesRequiredErrorMessage: t("form.countriesRequiredError"),
    companiesRequiredErrorMessage: t("form.companiesRequiredError"),
    fileRequiredErrorMessage: t("form.fileRequiredError"),
    sizeExceededMessage: t("form.sizeExceeded"),
    typeNotAllowedMessage: t("form.typeNotAllowed"),
    readFailedMessage: t("form.readFailed"),
    googleUrlInvalidMessage: t("form.googleUrlInvalid"),
    duplicateYearMonthErrorMessage: t("form.duplicateYearMonthError"),
    requiredIndicator: t("form.requiredIndicator"),
    submitErrorMessage: t("form.submitError"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t(`${category}.pageTitle`)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`${category}.pageDescription`)}
        </p>
      </div>

      {editable && (
        <AddMonthlyMaterialButton
          category={category}
          addButtonLabel={t("list.addButton")}
          formLabels={formLabels}
        />
      )}

      {materials.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("list.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        materials.map((material) => {
          const heading = formatHeading(locale, material.year, material.month);
          return (
            <MonthlyMaterialSection
              key={material.id}
              material={material}
              heading={heading}
              editable={editable}
              editButtonLabel={t("list.editButton")}
              deleteButtonLabel={t("delete.buttonLabel")}
              deleteConfirmTitle={t("delete.confirmTitle")}
              deleteConfirmMessage={t("delete.confirmMessage", { heading })}
              deleteConfirmButtonLabel={t("delete.confirmButton")}
              deleteCancelButtonLabel={t("delete.cancelButton")}
              deleteErrorMessage={t("delete.errorMessage")}
              viewerLabels={viewerLabels}
              formLabels={formLabels}
            />
          );
        })
      )}
    </div>
  );
}

export function MonthlyMaterialGallerySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[50vh] min-h-[360px] w-full" />
      </CardContent>
    </Card>
  );
}
