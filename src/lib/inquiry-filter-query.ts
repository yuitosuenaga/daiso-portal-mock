import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_STATUS_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import { isInquiryAgingFilterValue } from "@/lib/inquiry-aging";
import { EMPTY_INQUIRY_FILTERS, type InquiryFilters } from "@/lib/inquiry-filter";

export type InquiryListSearchParams = Record<string, string | string[] | undefined>;

/**
 * `InquiryFilters`のキー→URLクエリパラメータ名。ダッシュボードのリンクと一覧ページの
 * 双方で使う共有の対応表なので、短く読める名前（`unread`等）にする。
 */
export const INQUIRY_FILTER_QUERY_PARAMS: Record<keyof InquiryFilters, string> = {
  keyword: "q",
  status: "status",
  category: "category",
  urgency: "urgency",
  unreadOnly: "unread",
  unresolvedOnly: "unresolved",
  aging: "aging",
  receivedOn: "date",
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function toBoolean(value: string): boolean {
  return value === "1" || value === "true";
}

const RECEIVED_ON_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * URLクエリからダッシュボードのディープリンクを復元する。未知・不正な値は
 * 例外を投げず`EMPTY_INQUIRY_FILTERS`の値にフォールバックする（一覧を必ず表示できるようにするため）。
 */
export function parseInquiryFilters(searchParams?: InquiryListSearchParams): InquiryFilters {
  if (!searchParams) {
    return EMPTY_INQUIRY_FILTERS;
  }

  const status = firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.status]);
  const category = firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.category]);
  const urgency = firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.urgency]);
  const aging = firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.aging]);
  const receivedOn = firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.receivedOn]);

  return {
    keyword: firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.keyword]),
    status: (INQUIRY_STATUS_CODES as readonly string[]).includes(status)
      ? (status as InquiryFilters["status"])
      : "",
    category: (INQUIRY_CATEGORY_CODES as readonly string[]).includes(category)
      ? (category as InquiryFilters["category"])
      : "",
    urgency: (INQUIRY_URGENCY_CODES as readonly string[]).includes(urgency)
      ? (urgency as InquiryFilters["urgency"])
      : "",
    unreadOnly: toBoolean(firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.unreadOnly])),
    unresolvedOnly: toBoolean(
      firstValue(searchParams[INQUIRY_FILTER_QUERY_PARAMS.unresolvedOnly])
    ),
    aging: isInquiryAgingFilterValue(aging) ? aging : "",
    receivedOn: RECEIVED_ON_PATTERN.test(receivedOn) ? receivedOn : "",
  };
}

/**
 * 空値のキーはクエリ文字列に出力しない（不要なパラメータでURLを汚さないため）。
 * キー順は`INQUIRY_FILTER_QUERY_PARAMS`の定義順に固定し、生成されるhrefを安定させる。
 */
export function toInquiryFilterQueryString(patch: Partial<InquiryFilters>): string {
  const params = new URLSearchParams();

  for (const key of Object.keys(INQUIRY_FILTER_QUERY_PARAMS) as (keyof InquiryFilters)[]) {
    if (!(key in patch)) {
      continue;
    }
    const value = patch[key];
    const paramName = INQUIRY_FILTER_QUERY_PARAMS[key];

    if (typeof value === "boolean") {
      if (value) {
        params.set(paramName, "1");
      }
    } else if (typeof value === "string" && value !== "") {
      params.set(paramName, value);
    }
  }

  return params.toString();
}

export function buildInquiryListHref(basePath: string, patch: Partial<InquiryFilters>): string {
  const query = toInquiryFilterQueryString(patch);
  return query ? `${basePath}?${query}` : basePath;
}

/** Client Componentの`useState`初期値をリセットするための安定キー */
export function inquiryFilterStateKey(filters: InquiryFilters): string {
  return JSON.stringify(filters);
}
