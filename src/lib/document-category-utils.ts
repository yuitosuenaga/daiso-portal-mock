import type { DocumentCategoryFormOption } from "@/components/features/helpdesk-documents/DocumentForm";
import type { DocumentCategoryAdminView } from "@/types/document-category";

/**
 * ヘルプデスク側カテゴリ全件（`getAllDocumentCategories()`）を`DocumentForm`のカテゴリ選択肢
 * （既定言語＝jaの名称、要件20.10）へ整形する。
 */
export function toDocumentCategoryFormOptions(
  categories: DocumentCategoryAdminView[]
): DocumentCategoryFormOption[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    subCategories: category.children.map((child) => ({
      id: child.id,
      name: child.name,
    })),
  }));
}
