import { getTranslations } from "next-intl/server";
import { getLinks } from "@/lib/api/links";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { LinkItem } from "@/components/features/links/LinkItem";

const QUICK_LINKS_LIMIT = 6;

export async function QuickLinksWidget() {
  const [t, tItem] = await Promise.all([
    getTranslations("dashboard.quickLinks"),
    getTranslations("links.item"),
  ]);

  let links;
  try {
    links = await getLinks();
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

  const quickLinks = links.slice(0, QUICK_LINKS_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {quickLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {quickLinks.map((link) => (
              <LinkItem
                key={link.id}
                link={link}
                opensInNewTabLabel={tItem("opensInNewTab")}
              />
            ))}
          </div>
        )}
        <Link
          href="/links"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardContent>
    </Card>
  );
}

export function QuickLinksWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
