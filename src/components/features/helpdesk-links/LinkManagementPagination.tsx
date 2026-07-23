"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface LinkManagementPaginationProps {
  /** 現在ページ（1始まり） */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * リンク管理一覧向けの軽量なページネーションUI。前へ／次へ操作と
 * 現在ページ/総ページ数の表示を持つ。ラベルは`useTranslations`で自己解決する
 * （`DocumentManagementPagination`と同じ設計方針）。
 */
export function LinkManagementPagination({
  page,
  totalPages,
  onPageChange,
}: LinkManagementPaginationProps) {
  const t = useTranslations("helpdeskLinks.list.pagination");

  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        type="button"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {t("previousLabel")}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("pageStatus", { current: page, total: totalPages })}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t("nextLabel")}
      </Button>
    </div>
  );
}
