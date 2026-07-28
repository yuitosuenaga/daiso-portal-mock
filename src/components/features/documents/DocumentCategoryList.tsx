import { getTranslations, getLocale } from "next-intl/server";
import { getVisibleDocumentCategories } from "@/lib/api/document-categories";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentCategoryCard } from "@/components/features/documents/DocumentCategoryCard";
import type { DocumentCategorySummary } from "@/types/document-category";

/**
 * ドキュメントトップページ（要件20）。大分類カードのみを表示し、個別ドキュメントの
 * カード・プレビュー・キーワード検索欄は表示しない（要件20.1）。
 */
export async function DocumentCategoryList() {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("documents.list"),
    getTranslations("documents.categories"),
    getLocale(),
  ]);

  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );

  let categories: DocumentCategorySummary[];
  try {
    categories = await getVisibleDocumentCategories({ locale });
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

  if (categories.length === 0) {
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <DocumentCategoryCard
            key={category.id}
            name={category.name}
            documentCount={category.documentCount}
            href={`/documents/categories/${category.id}`}
            documentCountLabel={tCategories("documentCount", {
              count: category.documentCount,
            })}
          />
        ))}
      </div>
    </div>
  );
}

export function DocumentCategoryListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
