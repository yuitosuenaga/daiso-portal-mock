"use client";

import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface CountryTargetingSelectProps {
  /** ラベル・エラー表示との関連付けに用いるベースid（各内部要素はこれを接頭辞にする）。 */
  id: string;
  /** 選択候補の国・地域一覧（`value`/`label`の組）。 */
  options: SelectOption[];
  /** 現在選択済みの国コード一覧。 */
  value: string[];
  onChange: (value: string[]) => void;
  /** バリデーションエラー時にtrueを渡す。候補一覧のグループにaria-invalidとして反映する。 */
  ariaInvalid?: boolean;
  /** 候補一覧のグループ（`role="group"`）に付与するアクセシブルな名前（例: 「国・地域（複数選択可）」）。 */
  groupLabel: string;
  searchPlaceholder: string;
  /** 表示中の候補を一括選択するボタンのラベル。 */
  selectAllButtonLabel: string;
  /** 選択済みの国・地域をすべて解除するボタンのラベル。 */
  clearAllButtonLabel: string;
  /**
   * 選択件数の表示テキスト。`{count}`を選択件数（数値）に置き換えて表示する
   * （例: `"{count}件選択中"` / `"{count} selected"`）。
   *
   * 呼び出し元（ページコンポーネント）は、この文字列を`next-intl`の`getTranslations`から
   * `t("countriesSelectedCountLabel")`ではなく`t.raw("countriesSelectedCountLabel")`で
   * 取得すること。通常の`t()`はメッセージをICU MessageFormatとして解釈するため、
   * `{count}`を未指定の必須プレースホルダーとみなし、値を渡さない呼び出しでは
   * 翻訳キー名がそのまま表示されてしまう（実装時に発見した実機バグ）。`t.raw()`は
   * ICU解釈をせず、メッセージの生文字列（`{count}`をリテラルとして含む）を返す。
   */
  selectedCountLabel: string;
  /** 検索語に一致する候補が0件のときに表示するメッセージ。 */
  noResultsMessage: string;
  /** 選択済みチップの削除ボタンのアクセシブルラベル接頭辞（`{label}: 国名`の形式で使用）。 */
  removeChipButtonLabel: string;
}

/**
 * お知らせの配信対象「特定の国・地域を指定」向けの、検索・チェックボックス一覧・
 * 選択済み国のチップ表示・全選択/全解除を備えたカスタム複数選択コンポーネント。
 * ネイティブ`<select multiple>`（Ctrl+クリックによる多重選択が必須で直感的でない、
 * 検索・一括操作・選択状態の可視化ができない）を置き換える
 * （`announcements-management`spec 要件34）。
 *
 * `react-hook-form`の`Controller`から`value`/`onChange`を受け取るcontrolled
 * コンポーネントとして実装し、選択状態そのもの（`string[]`、国コード配列）は
 * 呼び出し元が保持する。検索語はUI表示のみに影響する内部状態として本コンポーネントが保持する。
 */
export function CountryTargetingSelect({
  id,
  options,
  value,
  onChange,
  ariaInvalid,
  groupLabel,
  searchPlaceholder,
  selectAllButtonLabel,
  clearAllButtonLabel,
  selectedCountLabel,
  noResultsMessage,
  removeChipButtonLabel,
}: CountryTargetingSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const reactId = useId();
  const searchInputId = `${id}-search`;
  const groupId = `${id}-group`;

  const filteredOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized)
    );
  }, [options, searchTerm]);

  const selectedOptions = useMemo(
    () => value.map((code) => options.find((option) => option.value === code)).filter(
      (option): option is SelectOption => option !== undefined
    ),
    [options, value]
  );

  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((entry) => entry !== code));
      return;
    }
    onChange([...value, code]);
  }

  function selectAllVisible() {
    const visibleCodes = filteredOptions.map((option) => option.value);
    onChange(Array.from(new Set([...value, ...visibleCodes])));
  }

  function clearAll() {
    onChange([]);
  }

  const allVisibleSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((option) => value.includes(option.value));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={searchInputId}
          type="text"
          value={searchTerm}
          placeholder={searchPlaceholder}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-auto min-w-[12rem] flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={allVisibleSelected}
          onClick={selectAllVisible}
        >
          {selectAllButtonLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={value.length === 0}
          onClick={clearAll}
        >
          {clearAllButtonLabel}
        </Button>
      </div>

      <p aria-live="polite" className="text-xs text-muted-foreground">
        {selectedCountLabel.replace("{count}", String(value.length))}
      </p>

      {selectedOptions.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <li key={option.value}>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-accent px-2 py-1 text-xs text-accent-foreground">
                {option.label}
                <button
                  type="button"
                  aria-label={`${removeChipButtonLabel}: ${option.label}`}
                  className="rounded-full font-medium leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => toggle(option.value)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div
        id={groupId}
        role="group"
        aria-label={groupLabel}
        data-invalid={ariaInvalid ? true : undefined}
        className={cn(
          "max-h-56 overflow-y-auto rounded-md border border-input bg-background p-2",
          ariaInvalid && "border-destructive"
        )}
      >
        {filteredOptions.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            {noResultsMessage}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filteredOptions.map((option) => {
              const checked = value.includes(option.value);
              const checkboxId = `${id}-option-${option.value}-${reactId}`;
              return (
                <li key={option.value}>
                  <label
                    htmlFor={checkboxId}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                      checked && "bg-accent text-accent-foreground"
                    )}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(option.value)}
                      className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span>{option.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
