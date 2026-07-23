import { getTranslations, getLocale } from "next-intl/server";
import { getFaqsForHelpdesk } from "@/lib/api/faqs";
import { FaqManagementListClient } from "@/components/features/helpdesk-faq/FaqManagementListClient";
import {
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { FaqWithTimestamp } from "@/lib/server/faq-service";

export async function FaqManagementList() {
  const [t, locale] = await Promise.all([
    getTranslations("helpdeskFaq.list"),
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
      <FaqManagementListClient faqs={faqs} locale={locale} listTitle={t("title")} />
    </div>
  );
}

export function FaqManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
