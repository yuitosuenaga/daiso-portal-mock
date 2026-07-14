import { getTranslations, getLocale } from "next-intl/server";
import { Link as NavLink } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLinksForHelpdesk } from "@/lib/api/links";
import { DeleteLinkButton } from "@/components/features/helpdesk-links/DeleteLinkButton";
import type { LinkWithTimestamp } from "@/lib/server/link-service";

export async function LinkManagementList() {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("helpdeskLinks.list"),
    getTranslations("links.categories"),
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
      <NavLink
        href="/helpdesk/links/new"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("addButton")}
      </NavLink>
    </div>
  );

  let links: LinkWithTimestamp[];
  try {
    links = await getLinksForHelpdesk();
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

  if (links.length === 0) {
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
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{link.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{link.url}</span>
                    <span>{tCategories(link.category)}</span>
                    <time dateTime={link.createdAt}>
                      {new Date(link.createdAt).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <NavLink
                    href={`/helpdesk/links/${link.id}/edit`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {t("editLink")}
                  </NavLink>
                  <DeleteLinkButton
                    linkId={link.id}
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

export function LinkManagementListSkeleton() {
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
