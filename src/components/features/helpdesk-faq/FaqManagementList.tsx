import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFaqsForHelpdesk } from "@/lib/api/faqs";
import { DeleteFaqButton } from "@/components/features/helpdesk-faq/DeleteFaqButton";
import type { FaqWithTimestamp } from "@/lib/server/faq-service";

export async function FaqManagementList() {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("helpdeskFaq.list"),
    getTranslations("faq.categories"),
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
        href="/helpdesk/faq/new"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("addButton")}
      </Link>
    </div>
  );

  let faqs: FaqWithTimestamp[];
  try {
    faqs = await getFaqsForHelpdesk();
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

  if (faqs.length === 0) {
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

  return (
    <div>
      {heading}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {faqs.map((faq) => (
              <li
                key={faq.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{faq.question}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{tCategories(faq.category)}</span>
                    <time dateTime={faq.createdAt}>
                      {new Date(faq.createdAt).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/helpdesk/faq/${faq.id}/edit`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {t("editLink")}
                  </Link>
                  <DeleteFaqButton
                    faqId={faq.id}
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

export function FaqManagementListSkeleton() {
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
