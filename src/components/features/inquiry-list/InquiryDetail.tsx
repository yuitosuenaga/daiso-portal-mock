import { getTranslations, getLocale } from "next-intl/server";
import { getInquiryById } from "@/lib/api/inquiries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

export async function InquiryDetail({ id }: { id: string }) {
  const [t, tStatuses, tCategories, tUrgencies, tCountries, locale] =
    await Promise.all([
      getTranslations("inquiryList.detail"),
      getTranslations("inquiryList.status"),
      getTranslations("inquiryForm.options.category"),
      getTranslations("inquiryForm.options.urgency"),
      getTranslations("inquiryForm.options.country"),
      getLocale(),
    ]);

  const backToListLink = (
    <Link
      href="/inquiry"
      className="text-sm text-primary underline-offset-4 hover:underline"
    >
      {t("backToList")}
    </Link>
  );

  let inquiry;
  try {
    inquiry = await getInquiryById(id);
  } catch {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
        {backToListLink}
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("notFound")}</p>
          </CardContent>
        </Card>
        {backToListLink}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>{tCategories(inquiry.category)}</CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              {t("urgencyLabel")}:{" "}
              <Badge variant={`urgency-${inquiry.urgency}`}>
                {tUrgencies(inquiry.urgency)}
              </Badge>
            </span>
            <span className="flex items-center gap-2">
              {t("statusLabel")}:{" "}
              <Badge variant={`status-${inquiry.status}`}>
                {tStatuses(inquiry.status)}
              </Badge>
            </span>
            <span>
              {t("storeRegionLabel")}: {inquiry.storeRegion}
            </span>
            <span>
              {t("createdAtLabel")}:{" "}
              <time dateTime={inquiry.createdAt}>
                {new Date(inquiry.createdAt).toLocaleString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("originalTextLabel")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {inquiry.originalText}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("submittedByLabel")}
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {inquiry.submittedBy.companyName} /{" "}
              {tCountries(inquiry.submittedBy.country)}
            </p>
          </div>
        </CardContent>
      </Card>
      {backToListLink}
    </div>
  );
}

export function InquiryDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
