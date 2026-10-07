"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { searchTargetingCandidatesAction } from "@/lib/actions/applicant-users";
import type {
  ApplicantUserTargetOption,
  CompanyTargetOption,
  TargetingCandidates,
} from "@/types/applicant-user";

const SEARCH_DEBOUNCE_MS = 250;

export interface UserTargetingSelectLabels {
  /** 検索結果リストのアクセシブルな名前 */
  groupLabel: string;
  searchPlaceholder: string;
  /** 検索語が未入力のときに表示する案内 */
  searchHint: string;
  noResultsMessage: string;
  searchErrorMessage: string;
  /** `{companies}`を選択会社数、`{users}`を選択個人数に置換して表示する */
  selectedCountLabel: string;
  /** 選択済みチップの削除ボタンのアクセシブルラベル接頭辞 */
  removeChipButtonLabel: string;
  /** 既に選択済みの検索結果に付けるラベル */
  alreadySelectedLabel: string;
  /** 検索中に表示する文言 */
  searchingLabel: string;
  /** `{count}`を検索結果の件数（会社＋個人）に置換してスクリーンリーダーへ通知する */
  resultsCountLabel: string;
  /** 無効化・削除済みで情報を復元できない選択済みチップに表示する文言 */
  unavailableLabel: string;
  /** 会社の候補・チップに付ける種別ラベル */
  companyBadgeLabel: string;
  /** 個人の候補・チップに付ける種別ラベル */
  userBadgeLabel: string;
  /** `{count}`を会社の有効アカウント数に置換して会社候補に表示する */
  companyMembersLabel: string;
  /** 会社を選ぶと所属の有効アカウント全員に配信されることの補足 */
  companyNote: string;
}

export interface TargetingSelection {
  userIds: string[];
  companyIds: string[];
}

export interface UserTargetingSelectProps {
  id: string;
  /** 選択済みの申請者アカウントIDと会社ID。 */
  value: TargetingSelection;
  onChange: (value: TargetingSelection) => void;
  /** 編集画面などで、`value.userIds`の表示情報を復元するための初期選択。 */
  initialUsers?: ApplicantUserTargetOption[];
  /** 編集画面などで、`value.companyIds`の表示情報を復元するための初期選択。 */
  initialCompanies?: CompanyTargetOption[];
  labels: UserTargetingSelectLabels;
  /** 国コード→表示名。未指定・未登録の国コードはコードのまま表示する。 */
  countryLabels?: Record<string, string>;
  ariaInvalid?: boolean;
  errorMessageId?: string;
}

const EMPTY_CANDIDATES: TargetingCandidates = { companies: [], users: [] };

const BADGE_BASE_CLASS = "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium";
const COMPANY_BADGE_CLASS = `${BADGE_BASE_CLASS} bg-primary/10 text-primary`;
const USER_BADGE_CLASS = `${BADGE_BASE_CLASS} bg-muted text-muted-foreground`;

/**
 * お知らせの配信対象「個人・会社を指定」向けの検索型複数選択。入力した検索語で会社（会社名・
 * 会社コード）と申請者アカウント（氏名・メールアドレス・会社名）を検索し、会社と個人を
 * 種別ラベル付きの別々の候補として表示する。クリックで選択済みへ追加する。選択状態は
 * `value`（アカウントID配列・会社ID配列）で呼び出し元が保持し、表示用の名称等は内部で保持する。
 */
export function UserTargetingSelect({
  id,
  value,
  onChange,
  initialUsers = [],
  initialCompanies = [],
  labels,
  countryLabels = {},
  ariaInvalid,
  errorMessageId,
}: UserTargetingSelectProps) {
  const countryLabelOf = (code: string) => countryLabels[code] ?? code;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TargetingCandidates>(EMPTY_CANDIDATES);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [knownUsers, setKnownUsers] = useState<Map<string, ApplicantUserTargetOption>>(
    () => new Map(initialUsers.map((user) => [user.id, user]))
  );
  const [knownCompanies, setKnownCompanies] = useState<Map<string, CompanyTargetOption>>(
    () => new Map(initialCompanies.map((company) => [company.id, company]))
  );
  const requestSeq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const seq = ++requestSeq.current;
    if (trimmed === "") {
      setResults(EMPTY_CANDIDATES);
      setSearched(false);
      setIsSearching(false);
      setHasSearchError(false);
      return;
    }
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const found = await searchTargetingCandidatesAction(trimmed);
        if (seq !== requestSeq.current) return;
        setResults(found);
        setHasSearchError(false);
      } catch {
        if (seq !== requestSeq.current) return;
        setResults(EMPTY_CANDIDATES);
        setHasSearchError(true);
      }
      setSearched(true);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function addUser(user: ApplicantUserTargetOption) {
    if (value.userIds.includes(user.id)) return;
    setKnownUsers((previous) => new Map(previous).set(user.id, user));
    onChange({ ...value, userIds: [...value.userIds, user.id] });
  }

  function addCompany(company: CompanyTargetOption) {
    if (value.companyIds.includes(company.id)) return;
    setKnownCompanies((previous) => new Map(previous).set(company.id, company));
    onChange({ ...value, companyIds: [...value.companyIds, company.id] });
  }

  function removeUser(userId: string) {
    onChange({ ...value, userIds: value.userIds.filter((selectedId) => selectedId !== userId) });
  }

  function removeCompany(companyId: string) {
    onChange({
      ...value,
      companyIds: value.companyIds.filter((selectedId) => selectedId !== companyId),
    });
  }

  const resultCount = results.companies.length + results.users.length;
  const hasResults = resultCount > 0;
  const selectedTotal = value.companyIds.length + value.userIds.length;

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
          hasResults && !isSearching && !hasSearchError
            ? "max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border"
            : "max-h-72 overflow-y-auto"
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
        ) : searched && !hasResults ? (
          <li className="px-1 py-2 text-sm text-muted-foreground">{labels.noResultsMessage}</li>
        ) : (
          <>
            {results.companies.map((company) => {
              const selected = value.companyIds.includes(company.id);
              return (
                <li key={`company-${company.id}`}>
                  <button
                    type="button"
                    disabled={selected}
                    onClick={() => addCompany(company)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-default disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className={COMPANY_BADGE_CLASS}>{labels.companyBadgeLabel}</span>
                      {company.name}
                      {selected && (
                        <span className="text-xs font-normal text-muted-foreground">
                          {labels.alreadySelectedLabel}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {company.companyCode} / {countryLabelOf(company.country)} /{" "}
                      {labels.companyMembersLabel.replace(
                        "{count}",
                        String(company.activeUserCount)
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {results.users.map((user) => {
              const selected = value.userIds.includes(user.id);
              return (
                <li key={`user-${user.id}`}>
                  <button
                    type="button"
                    disabled={selected}
                    onClick={() => addUser(user)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-default disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className={USER_BADGE_CLASS}>{labels.userBadgeLabel}</span>
                      {user.displayName}
                      {selected && (
                        <span className="text-xs font-normal text-muted-foreground">
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
            })}
          </>
        )}
      </ul>

      <p className="sr-only" aria-live="polite">
        {searched && !isSearching && !hasSearchError
          ? labels.resultsCountLabel.replace("{count}", String(resultCount))
          : ""}
      </p>

      <p className="text-xs text-muted-foreground">{labels.companyNote}</p>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {labels.selectedCountLabel
          .replace("{companies}", String(value.companyIds.length))
          .replace("{users}", String(value.userIds.length))}
      </p>

      {selectedTotal > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.companyIds.map((companyId) => {
            const company = knownCompanies.get(companyId);
            const text = company
              ? `${company.name} (${countryLabelOf(company.country)})`
              : labels.unavailableLabel;
            return (
              <li
                key={`company-${companyId}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs"
              >
                <span className={COMPANY_BADGE_CLASS}>{labels.companyBadgeLabel}</span>
                <span>{text}</span>
                <button
                  type="button"
                  aria-label={`${labels.removeChipButtonLabel}: ${labels.companyBadgeLabel} ${text}`}
                  onClick={() => removeCompany(companyId)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </li>
            );
          })}
          {value.userIds.map((userId) => {
            const user = knownUsers.get(userId);
            const text = user
              ? `${user.displayName} (${user.companyName} / ${countryLabelOf(user.country)})`
              : labels.unavailableLabel;
            return (
              <li
                key={`user-${userId}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs"
              >
                <span className={USER_BADGE_CLASS}>{labels.userBadgeLabel}</span>
                <span>{text}</span>
                <button
                  type="button"
                  aria-label={`${labels.removeChipButtonLabel}: ${labels.userBadgeLabel} ${text}`}
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
