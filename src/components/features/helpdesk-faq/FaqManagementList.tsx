import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getFaqsForHelpdesk } from "@/lib/api/faqs";
import { DeleteFaqButton } from "@/components/features/helpdesk-faq/DeleteFaqButton";
import {
  ManagementListCard,
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListRow,
  ManagementListRows,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { FaqWithTimestamp } from "@/lib/server/faq-service";

export async function FaqManagementList() {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("helpdeskFaq.list"),
    getTranslations("faq.categories"),
    getLocale(),
  ]);

  const heading = (
    <ManagementListHeading
      title={t("title")}
      description={t("description")}
      addHref="/helpdesk/faq/new"
      addLabel={t("addButton")}
    />
  );

  let faqs: FaqWithTimestamp[];
  try {
    faqs = await getFaqsForHelpdesk();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("empty")} />
      </div>
    );
  }

  return (
    <div>
      {heading}
      <ManagementListCard title={t("title")}>
        <ManagementListRows>
          {faqs.map((faq) => (
            <ManagementListRow key={faq.id}>
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
            </ManagementListRow>
          ))}
        </ManagementListRows>
      </ManagementListCard>
    </div>
  );
}

export function FaqManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
