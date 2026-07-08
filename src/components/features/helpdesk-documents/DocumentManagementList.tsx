import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllDocuments } from "@/lib/api/documents";
import { INQUIRY_COUNTRY_CODES } from "@/lib/constants/inquiry-options";
import { DOCUMENT_COMPANY_OPTIONS } from "@/lib/constants/document-company-options";
import { formatFileSize } from "@/lib/attachment-utils";
import { DeleteDocumentButton } from "@/components/features/helpdesk-documents/DeleteDocumentButton";
import type { Document, DocumentTargeting } from "@/types/document";

function targetingLabel(
  targeting: DocumentTargeting,
  labels: {
    allLabel: string;
    countriesLabel: string;
    companiesLabel: string;
    countryLabels: Record<string, string>;
    companyLabels: Record<string, string>;
  }
): string {
  if (targeting.scope === "all") {
    return labels.allLabel;
  }
  if (targeting.scope === "countries") {
    return `${labels.countriesLabel}: ${targeting.countries
      .map((code) => labels.countryLabels[code] ?? code)
      .join(", ")}`;
  }
  return `${labels.companiesLabel}: ${targeting.companyCodes
    .map((code) => labels.companyLabels[code] ?? code)
    .join(", ")}`;
}

export async function DocumentManagementList() {
  const [t, tCountries, locale] = await Promise.all([
    getTranslations("helpdeskDocuments.list"),
    getTranslations("inquiryForm.options.country"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <Link
        href="/helpdesk/documents/new"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("addButton")}
      </Link>
    </div>
  );

  let documents: Document[];
  try {
    documents = await getAllDocuments();
  } catch {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{document.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(document.fileSize)}</span>
                    <time dateTime={document.uploadedAt}>
                      {new Date(document.uploadedAt).toLocaleDateString(
                        locale,
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </time>
                    <span>
                      {targetingLabel(document.targeting, {
                        allLabel: t("targetingAllLabel"),
                        countriesLabel: t("targetingCountriesLabel"),
                        companiesLabel: t("targetingCompaniesLabel"),
                        countryLabels,
                        companyLabels,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/helpdesk/documents/${document.id}/edit`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {t("editLink")}
                  </Link>
                  <DeleteDocumentButton
                    documentId={document.id}
                    deleteButtonLabel={t("deleteButton")}
                    confirmMessage={t("deleteConfirm")}
                    errorMessage={t("deleteError")}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export function DocumentManagementListSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
