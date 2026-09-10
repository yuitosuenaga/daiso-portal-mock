import {
  INQUIRY_CATEGORY_CODES,
  INQUIRY_COUNTRY_CODES,
  INQUIRY_STATUS_CODES,
  INQUIRY_URGENCY_CODES,
} from "@/lib/constants/inquiry-options";
import { isInquiryAgingFilterValue } from "@/lib/inquiry-aging";
import {
  EMPTY_HELPDESK_INQUIRY_FILTERS,
  type HelpdeskInquiryFilters,
} from "@/lib/helpdesk-inquiry-list";
import type { InquiryListSearchParams } from "@/lib/inquiry-filter-query";

/**
 * `HelpdeskInquiryFilters`のキー→URLクエリパラメータ名。
 * `company`/`staff`は自由文字列（既存フィルタと同じ部分一致・完全一致の仕様）のため検証はしない。
 */
export const HELPDESK_INQUIRY_FILTER_QUERY_PARAMS: Record<keyof HelpdeskInquiryFilters, string> = {
  companyName: "company",
  keyword: "q",
  country: "country",
  category: "category",
  status: "status",
  urgency: "urgency",
  unclaimedOnly: "unclaimed",
  claimedBy: "staff",
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
 * 例外を投げず`EMPTY_HELPDESK_INQUIRY_FILTERS`の値にフォールバックする（一覧を必ず表示できるようにするため）。
 */
export function parseHelpdeskInquiryFilters(
  searchParams?: InquiryListSearchParams
): HelpdeskInquiryFilters {
  if (!searchParams) {
    return EMPTY_HELPDESK_INQUIRY_FILTERS;
  }

  const country = firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.country]);
  const category = firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.category]);
  const status = firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.status]);
  const urgency = firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.urgency]);
  const aging = firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.aging]);
  const receivedOn = firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.receivedOn]);

  return {
    companyName: firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.companyName]),
    keyword: firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.keyword]),
    country: (INQUIRY_COUNTRY_CODES as readonly string[]).includes(country) ? country : "",
    category: (INQUIRY_CATEGORY_CODES as readonly string[]).includes(category) ? category : "",
    status: (INQUIRY_STATUS_CODES as readonly string[]).includes(status)
      ? (status as HelpdeskInquiryFilters["status"])
      : "",
    urgency: (INQUIRY_URGENCY_CODES as readonly string[]).includes(urgency)
      ? (urgency as HelpdeskInquiryFilters["urgency"])
      : "",
    unclaimedOnly: toBoolean(
      firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.unclaimedOnly])
    ),
    claimedBy: firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.claimedBy]),
    unresolvedOnly: toBoolean(
      firstValue(searchParams[HELPDESK_INQUIRY_FILTER_QUERY_PARAMS.unresolvedOnly])
    ),
    aging: isInquiryAgingFilterValue(aging) ? aging : "",
    receivedOn: RECEIVED_ON_PATTERN.test(receivedOn) ? receivedOn : "",
  };
}

/**
 * 空値のキーはクエリ文字列に出力しない。キー順は
 * `HELPDESK_INQUIRY_FILTER_QUERY_PARAMS`の定義順に固定し、生成されるhrefを安定させる。
 */
export function toHelpdeskInquiryFilterQueryString(
  patch: Partial<HelpdeskInquiryFilters>
): string {
  const params = new URLSearchParams();

  for (const key of Object.keys(
    HELPDESK_INQUIRY_FILTER_QUERY_PARAMS
  ) as (keyof HelpdeskInquiryFilters)[]) {
    if (!(key in patch)) {
      continue;
    }
    const value = patch[key];
    const paramName = HELPDESK_INQUIRY_FILTER_QUERY_PARAMS[key];

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

export function buildHelpdeskInquiryListHref(
  basePath: string,
  patch: Partial<HelpdeskInquiryFilters>
): string {
  const query = toHelpdeskInquiryFilterQueryString(patch);
  return query ? `${basePath}?${query}` : basePath;
}

/** Client Componentの`useState`初期値をリセットするための安定キー */
export function helpdeskInquiryFilterStateKey(filters: HelpdeskInquiryFilters): string {
  return JSON.stringify(filters);
}
