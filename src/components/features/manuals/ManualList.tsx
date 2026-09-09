import { getTranslations, getLocale } from "next-intl/server";
import { getManuals } from "@/lib/api/manuals";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ManualListClient } from "@/components/features/manuals/ManualListClient";
import type { Manual } from "@/types/manual";

/**
 * 自社に公開範囲が及ぶマニュアル一覧（`documents`specの`DocumentList`のマニュアル版）。
 * カテゴリ・年月マスタが存在しない固定enumのため、大分類ページのような専用ルートは持たず、
 * `/manuals`単一ページでキーワード×カテゴリ×年×月の併用検索を行う。
 */
export async function ManualList() {
  const [t, locale] = await Promise.all([
    getTranslations("manuals.list"),
    getLocale(),
  ]);

  let manuals: Manual[];
  try {
    manuals = await getManuals({ locale });
  } catch {
    return (
      <div>
        <Heading title={t("title")} description={t("description")} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (manuals.length === 0) {
    return (
      <div>
        <Heading title={t("title")} description={t("description")} />
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
      <Heading title={t("title")} description={t("description")} />
      <ManualListClient
        manuals={manuals}
        locale={locale}
        downloadLinkLabel={t("downloadLink")}
        openOriginalLinkLabel={t("openOriginalLink")}
        revisionLabel={t("revisionLabel")}
      />
    </div>
  );
}

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ManualListSkeleton() {
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
