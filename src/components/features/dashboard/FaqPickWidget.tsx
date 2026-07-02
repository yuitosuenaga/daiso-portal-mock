import { getTranslations } from "next-intl/server";
import { getFaqs } from "@/lib/api/faqs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

const FAQ_PICK_LIMIT = 5;

export async function FaqPickWidget() {
  const t = await getTranslations("dashboard.faqPick");

  let faqs;
  try {
    faqs = await getFaqs();
  } catch {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        </CardContent>
      </Card>
    );
  }

  const pickedFaqs = faqs.slice(0, FAQ_PICK_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {pickedFaqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {pickedFaqs.map((faq) => (
              <li key={faq.id} className="py-2">
                <Link
                  href="/faq"
                  className="line-clamp-2 text-sm hover:underline"
                >
                  {faq.question}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/faq"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardContent>
    </Card>
  );
}

export function FaqPickWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
