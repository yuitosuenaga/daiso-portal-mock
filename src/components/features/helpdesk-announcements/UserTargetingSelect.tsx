"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { searchApplicantUsersForTargetingAction } from "@/lib/actions/applicant-users";
import type { ApplicantUserTargetOption } from "@/types/applicant-user";

const SEARCH_DEBOUNCE_MS = 250;

export interface UserTargetingSelectLabels {
  /** 検索結果リストのアクセシブルな名前 */
  groupLabel: string;
  searchPlaceholder: string;
  /** 検索語が未入力のときに表示する案内 */
  searchHint: string;
  noResultsMessage: string;
  searchErrorMessage: string;
  /** `{count}`を選択人数に置換して表示する */
  selectedCountLabel: string;
  /** 選択済みチップの削除ボタンのアクセシブルラベル接頭辞 */
  removeChipButtonLabel: string;
  /** 既に選択済みの検索結果に付けるラベル */
  alreadySelectedLabel: string;
  /** 検索中に表示する文言 */
  searchingLabel: string;
  /** `{count}`を検索結果の件数に置換してスクリーンリーダーへ通知する */
  resultsCountLabel: string;
  /** 無効化・削除済みで情報を復元できない選択済みチップに表示する文言 */
  unavailableLabel: string;
}

export interface UserTargetingSelectProps {
  id: string;
  /** 選択済みの申請者アカウントID。 */
  value: string[];
  onChange: (value: string[]) => void;
  /** 編集画面などで、`value`に含まれるIDの表示情報を復元するための初期選択。 */
  initialUsers?: ApplicantUserTargetOption[];
  labels: UserTargetingSelectLabels;
  /** 国コード→表示名。未指定・未登録の国コードはコードのまま表示する。 */
  countryLabels?: Record<string, string>;
  ariaInvalid?: boolean;
  errorMessageId?: string;
}

function userSummary(user: ApplicantUserTargetOption, countryLabel: string): string {
  return `${user.displayName} (${user.companyName} / ${countryLabel})`;
}

/**
 * お知らせの配信対象「個人を指定」向けの検索型複数選択。氏名・メールアドレス・会社名の
 * 部分一致で申請者アカウントを検索し、クリックで選択済みへ追加する。選択状態は
 * `value`（アカウントID配列）で呼び出し元が保持し、表示用の氏名等は内部で保持する。
 */
export function UserTargetingSelect({
  id,
  value,
  onChange,
  initialUsers = [],
  labels,
  countryLabels = {},
  ariaInvalid,
  errorMessageId,
}: UserTargetingSelectProps) {
  const countryLabelOf = (code: string) => countryLabels[code] ?? code;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApplicantUserTargetOption[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [knownUsers, setKnownUsers] = useState<Map<string, ApplicantUserTargetOption>>(
    () => new Map(initialUsers.map((user) => [user.id, user]))
  );
  const requestSeq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const seq = ++requestSeq.current;
    if (trimmed === "") {
      setResults([]);
      setSearched(false);
      setIsSearching(false);
      setHasSearchError(false);
      return;
    }
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const found = await searchApplicantUsersForTargetingAction(trimmed);
        if (seq !== requestSeq.current) return;
        setResults(found);
        setHasSearchError(false);
      } catch {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setHasSearchError(true);
      }
      setSearched(true);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function addUser(user: ApplicantUserTargetOption) {
    if (value.includes(user.id)) return;
    setKnownUsers((previous) => new Map(previous).set(user.id, user));
    onChange([...value, user.id]);
  }

  function removeUser(userId: string) {
    onChange(value.filter((selectedId) => selectedId !== userId));
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={`${id}-search`}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={labels.searchPlaceholder}
        autoComplete="off"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaInvalid ? errorMessageId : undefined}
      />

      <ul
        id={id}
        aria-label={labels.groupLabel}
        aria-busy={isSearching}
        className={
          results.length > 0 && !isSearching && !hasSearchError
            ? "max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border"
            : "max-h-56 overflow-y-auto"
        }
      >
        {query.trim() === "" ? (
          <li className="px-1 py-2 text-sm text-muted-foreground">{labels.searchHint}</li>
        ) : isSearching ? (
          <li className="px-1 py-2 text-sm text-muted-foreground">{labels.searchingLabel}</li>
        ) : hasSearchError ? (
          <li className="px-1 py-2 text-sm text-destructive" role="alert">
            {labels.searchErrorMessage}
          </li>
        ) : searched && results.length === 0 ? (
          <li className="px-1 py-2 text-sm text-muted-foreground">{labels.noResultsMessage}</li>
        ) : (
          results.map((user) => {
            const selected = value.includes(user.id);
            return (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={selected}
                  onClick={() => addUser(user)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-default disabled:opacity-60"
                >
                  <span className="font-medium text-foreground">
                    {user.displayName}
                    {selected && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {labels.alreadySelectedLabel}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.email} · {user.companyName} / {countryLabelOf(user.country)}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      <p className="sr-only" aria-live="polite">
        {searched && !isSearching && !hasSearchError
          ? labels.resultsCountLabel.replace("{count}", String(results.length))
          : ""}
      </p>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {labels.selectedCountLabel.replace("{count}", String(value.length))}
      </p>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((userId) => {
            const user = knownUsers.get(userId);
            const text = user
              ? userSummary(user, countryLabelOf(user.country))
              : labels.unavailableLabel;
            return (
              <li
                key={userId}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs"
              >
                <span>{text}</span>
                <button
                  type="button"
                  aria-label={`${labels.removeChipButtonLabel}: ${text}`}
                  onClick={() => removeUser(userId)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
