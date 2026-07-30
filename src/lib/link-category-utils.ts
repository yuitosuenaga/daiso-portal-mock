import type { LinkCategoryFormOption } from "@/components/features/helpdesk-links/LinkForm";
import type { LinkCategoryAdminView } from "@/types/link-category";

/**
 * ヘルプデスク側カテゴリ全件（`getAllLinkCategories()`）を`LinkForm`のカテゴリ選択肢
 * （既定言語＝jaの名称、要件14.10）へ整形する（`toDocumentCategoryFormOptions`と同型）。
 */
export function toLinkCategoryFormOptions(
  categories: LinkCategoryAdminView[]
): LinkCategoryFormOption[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    subCategories: category.children.map((child) => ({
      id: child.id,
      name: child.name,
    })),
  }));
}
