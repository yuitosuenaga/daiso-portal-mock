import { getTranslations } from "next-intl/server";

import { BackLink } from "@/components/ui/back-link";
import { CompanyCsvImportForm } from "@/components/features/helpdesk-companies/CompanyCsvImportForm";
import type { CompanyCsvRowErrorCode } from "@/lib/company-csv";

const CSV_TEMPLATE_ROWS = [
  ["name", "country", "companyCode"],
  ["Daiso Thailand", "TH", "th-daiso-thailand"],
  ["Daiso Vietnam", "VN", "vn-daiso-vietnam"],
];

const CSV_ROW_ERROR_CODES: readonly CompanyCsvRowErrorCode[] = [
  "required",
  "companyCodeFormat",
  "invalidCountry",
  "companyCodeDuplicate",
  "duplicateInFile",
];

function buildCsvTemplateDataUrl(): string {
  const csvContent = CSV_TEMPLATE_ROWS.map((row) => row.join(",")).join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

/**
 * 販社CSV一括登録画面（要件19.1〜19.3）。見出し・説明・CSVテンプレートDL導線・
 * アップロードフォーム（`CompanyCsvImportForm`）を組み立てるServer Component。
 */
export default async function HelpdeskCompanyImportPage() {
  const [tImport, tForm] = await Promise.all([
    getTranslations("helpdeskCompanies.import"),
    getTranslations("helpdeskCompanies.form"),
  ]);

  const errorMessages = Object.fromEntries(
    CSV_ROW_ERROR_CODES.map((code) => [code, tImport(`errors.${code}`)])
  ) as Record<CompanyCsvRowErrorCode, string>;

  const fileErrorMessages: Record<string, string> = {
    empty: tImport("fileErrors.empty"),
    headerMismatch: tImport("fileErrors.headerMismatch"),
    noDataRows: tImport("fileErrors.noDataRows"),
  };

  return (
    <div className="max-w-3xl space-y-4">
      <BackLink href="/helpdesk/companies" label={tForm("backToList")} />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{tImport("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tImport("description")}</p>
      </div>

      <a
        href={buildCsvTemplateDataUrl()}
        download="companies-template.csv"
        className="inline-flex items-center text-sm text-primary underline-offset-4 hover:underline"
      >
        {tImport("templateDownloadLabel")}
      </a>

      <CompanyCsvImportForm
        fileInputLabel={tImport("fileInputLabel")}
        uploadButtonLabel={tImport("uploadButtonLabel")}
        uploadingLabel={tImport("uploadingLabel")}
        resultsHeading={tImport("resultsHeading")}
        rowNumberHeader={tImport("rowNumberHeader")}
        rowNameHeader={tImport("rowNameHeader")}
        rowCompanyCodeHeader={tImport("rowCompanyCodeHeader")}
        rowStatusHeader={tImport("rowStatusHeader")}
        rowErrorsHeader={tImport("rowErrorsHeader")}
        statusOkLabel={tImport("statusOk")}
        statusErrorLabel={tImport("statusError")}
        successMessageTemplate={tImport("successMessage")}
        noFileSelectedMessage={tImport("noFileSelected")}
        genericErrorMessage={tImport("genericError")}
        errorMessages={errorMessages}
        fileErrorMessages={fileErrorMessages}
      />
    </div>
  );
}
