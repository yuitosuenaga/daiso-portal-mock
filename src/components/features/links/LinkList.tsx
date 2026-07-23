import { getTranslations, getLocale } from "next-intl/server";
import { getLinks } from "@/lib/api/links";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LINK_CATEGORY_CODES } from "@/lib/constants/link-options";
import { LinkListClient } from "@/components/features/links/LinkListClient";
import type { LinkWithTimestamp } from "@/types/link";

export async function LinkList() {
  const [t, locale] = await Promise.all([
    getTranslations("links"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("list.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("list.description")}</p>
    </div>
  );

  let links: LinkWithTimestamp[];
  try {
    links = await getLinks();
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

  if (links.length === 0) {
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

  return (
    <div>
      {heading}
      <LinkListClient
        links={links}
        locale={locale}
        opensInNewTabLabel={t("item.opensInNewTab")}
        newBadgeLabel={t("item.newBadge")}
      />
    </div>
  );
}

export function LinkListSkeleton() {
  return (
    <div className="space-y-6">
      {LINK_CATEGORY_CODES.map((category) => (
        <Card key={category}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
