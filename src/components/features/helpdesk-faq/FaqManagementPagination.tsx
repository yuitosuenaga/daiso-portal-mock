"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface FaqManagementPaginationProps {
  /** 現在ページ（1始まり） */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * FAQ管理一覧向けの軽量なページネーションUI。前へ／次へ操作と
 * 現在ページ/総ページ数の表示を持つ（`DocumentManagementPagination`を踏襲）。
 */
export function FaqManagementPagination({
  page,
  totalPages,
  onPageChange,
}: FaqManagementPaginationProps) {
  const t = useTranslations("helpdeskFaq.list.pagination");

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
