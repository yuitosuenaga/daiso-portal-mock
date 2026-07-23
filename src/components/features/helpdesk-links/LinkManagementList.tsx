import { getTranslations, getLocale } from "next-intl/server";
import { getLinksForHelpdesk } from "@/lib/api/links";
import { LinkManagementListClient } from "@/components/features/helpdesk-links/LinkManagementListClient";
import {
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { LinkWithTimestamp } from "@/lib/server/link-service";

export async function LinkManagementList() {
  const [t, locale] = await Promise.all([
    getTranslations("helpdeskLinks.list"),
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
      <LinkManagementListClient
        links={links}
        locale={locale}
        listTitle={t("title")}
        editLinkLabel={t("editLink")}
      />
    </div>
  );
}

export function LinkManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
