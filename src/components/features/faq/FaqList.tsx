import { getTranslations, getLocale } from "next-intl/server";
import { getFaqs } from "@/lib/api/faqs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FAQ_CATEGORY_CODES } from "@/lib/constants/faq-options";
import { FaqListClient } from "@/components/features/faq/FaqListClient";
import type { Faq, FaqCategory } from "@/types/faq";

export async function FaqList() {
  const [t, locale] = await Promise.all([getTranslations("faq"), getLocale()]);

  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("list.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("list.description")}</p>
    </div>
  );

  let faqs: Faq[];
  try {
    faqs = await getFaqs();
  } catch {
    return (
      <div>
        {heading}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("list.error")}</p>
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
            <p className="text-sm text-muted-foreground">{t("list.empty")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryLabels = FAQ_CATEGORY_CODES.reduce(
    (labels, category) => {
      labels[category] = t(`categories.${category}`);
      return labels;
    },
    {} as Record<FaqCategory, string>
  );

  return (
    <div>
      {heading}
      <FaqListClient
        faqs={faqs}
        locale={locale}
        categoryLabels={categoryLabels}
        updatedLabel={t("list.updatedLabel")}
        newBadgeLabel={t("list.newBadge")}
      />
    </div>
  );
}

export function FaqListSkeleton() {
  return (
    <div className="space-y-6">
      {FAQ_CATEGORY_CODES.map((category) => (
        <Card key={category}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
