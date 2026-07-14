"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface DocumentSearchBarProps {
  keyword: string;
  onChange: (keyword: string) => void;
  onClear: () => void;
}

/**
 * 書類一覧の検索欄（キーワードのみ）。状態は保持せず、変更を都度
 * `onChange` で呼び出し元へ通知する（`AnnouncementFilterBar`と同じ設計方針）。
 */
export function DocumentSearchBar({
  keyword,
  onChange,
  onClear,
}: DocumentSearchBarProps) {
  const t = useTranslations("documents.search");

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 space-y-1 min-w-[240px]">
        <Label htmlFor="document-search-keyword">{t("keywordLabel")}</Label>
        <Input
          id="document-search-keyword"
          value={keyword}
          placeholder={t("keywordPlaceholder")}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <Button type="button" variant="outline" onClick={onClear}>
        {t("clearButton")}
      </Button>
    </div>
  );
}
