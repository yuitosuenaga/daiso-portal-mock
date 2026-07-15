import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLinksForHelpdesk } from "@/lib/api/links";
import { DeleteLinkButton } from "@/components/features/helpdesk-links/DeleteLinkButton";
import {
  ManagementListCard,
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListRow,
  ManagementListRows,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { LinkWithTimestamp } from "@/lib/server/link-service";

export async function LinkManagementList() {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("helpdeskLinks.list"),
    getTranslations("links.categories"),
    getLocale(),
  ]);

  const heading = (
    <ManagementListHeading
      title={t("title")}
      description={t("description")}
      addHref="/helpdesk/links/new"
      addLabel={t("addButton")}
    />
  );

  let links: LinkWithTimestamp[];
  try {
    links = await getLinksForHelpdesk();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  if (links.length === 0) {
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
          {links.map((link) => (
            <ManagementListRow key={link.id}>
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
                <Link
                  href={`/helpdesk/links/${link.id}/edit`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {t("editLink")}
                </Link>
                <DeleteLinkButton
                  linkId={link.id}
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

export function LinkManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
