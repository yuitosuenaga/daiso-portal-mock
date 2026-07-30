import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLinksForHelpdesk } from "@/lib/api/links";
import { getAllLinkCategories } from "@/lib/api/link-categories";
import { LinkManagementListClient } from "@/components/features/helpdesk-links/LinkManagementListClient";
import { LinkPreviewPanel } from "@/components/features/helpdesk-links/LinkPreviewPanel";
import {
  ManagementListHeading,
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { LinkWithTimestamp } from "@/lib/server/link-service";

export async function LinkManagementList() {
  const [t, locale, categories, previewPanel] = await Promise.all([
    getTranslations("helpdeskLinks.list"),
    getLocale(),
    getAllLinkCategories(),
    LinkPreviewPanel(),
  ]);

  /** 大分類・中分類の両方のIDを対象にした表示名辞書（行の大分類名・中分類名表示に使う）。 */
  const categoryLabels: Record<string, string> = {};
  categories.forEach((category) => {
    categoryLabels[category.id] = category.name;
    category.children.forEach((child) => {
      categoryLabels[child.id] = child.name;
    });
  });

  const heading = (
    <div>
      <ManagementListHeading
        title={t("title")}
        description={t("description")}
        addHref="/helpdesk/links/new"
        addLabel={t("addButton")}
      />
      <div className="mb-6 -mt-4 flex flex-wrap items-center gap-4">
        <Link
          href="/helpdesk/links/categories"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t("manageCategoriesLink")}
        </Link>
        {previewPanel}
      </div>
    </div>
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
        categories={categories}
        categoryLabels={categoryLabels}
        unsetCategoryLabel={t("categoryUnset")}
      />
    </div>
  );
}

export function LinkManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
