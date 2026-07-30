import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getAllLinkCategories } from "@/lib/api/link-categories";
import { LinkCategoryManagementListClient } from "@/components/features/helpdesk-links/LinkCategoryManagementListClient";
import { LinkPreviewPanel } from "@/components/features/helpdesk-links/LinkPreviewPanel";
import {
  ManagementListMessageCard,
  ManagementListSkeleton,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { LinkCategoryAdminView } from "@/types/link-category";

/**
 * リンクカテゴリ管理画面（`/helpdesk/links/categories`）のサーバー側。
 * カテゴリ全件を取得し、見出しと戻る導線を描画する。「追加」がダイアログ起動のため
 * `ManagementListHeading`は使わず、同等のマークアップを本コンポーネントで用意する
 * （要件13.1・13.2・13.15）。
 */
export async function LinkCategoryManagementList() {
  const [t, previewPanel] = await Promise.all([
    getTranslations("helpdeskLinks.categories.list"),
    LinkPreviewPanel(),
  ]);

  const heading = (
    <div className="mb-6 space-y-2">
      <BackLink href="/helpdesk/links" label={t("backToLinks")} />
      <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {previewPanel}
    </div>
  );

  let categories: LinkCategoryAdminView[];
  try {
    categories = await getAllLinkCategories();
  } catch {
    return (
      <div>
        {heading}
        <ManagementListMessageCard message={t("error")} />
      </div>
    );
  }

  return (
    <div>
      {heading}
      <LinkCategoryManagementListClient categories={categories} />
    </div>
  );
}

export function LinkCategoryManagementListSkeleton() {
  return <ManagementListSkeleton />;
}
