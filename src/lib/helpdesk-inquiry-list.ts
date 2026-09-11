import type { Inquiry } from "@/types/inquiry";
import type { InquiryAgingFilterValue } from "@/lib/inquiry-aging";
import { matchesInquiryAging } from "@/lib/inquiry-aging";
import { toReferenceDateKey } from "@/lib/reference-date";

const UNRESOLVED_STATUSES: Inquiry["status"][] = ["new", "in_progress"];

const URGENCY_PRIORITY: Record<Inquiry["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * 対応状況のソート優先度（新規→対応中→解決済みの順）。
 * 未対応の案件が緊急度の高い解決済み案件などに埋もれないよう、最優先の基準とする。
 */
const STATUS_SORT_PRIORITY: Record<Inquiry["status"], number> = {
  new: 0,
  in_progress: 1,
  resolved: 2,
};

/**
 * 対応状況（新規→対応中→解決済み）を最優先の基準とし、次に緊急度（高→中→低）、
 * 同一条件内は受付日時（createdAt）の昇順（古いものを優先表示）で並び替える。
 * 引数の配列は変更しない。
 */
export function sortInquiriesForHelpdesk(inquiries: Inquiry[]): Inquiry[] {
  return [...inquiries].sort((a, b) => {
    const statusDiff =
      STATUS_SORT_PRIORITY[a.status] - STATUS_SORT_PRIORITY[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const urgencyDiff = URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency];
    if (urgencyDiff !== 0) {
      return urgencyDiff;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * ヘルプデスク側一覧の検索・横断フィルタ条件。
 * 各フィールドが空文字列のときは当該条件による絞り込みを行わない。
 */
export interface HelpdeskInquiryFilters {
  companyName: string;
  keyword: string;
  country: string;
  category: string;
  status: "" | Inquiry["status"];
  urgency: "" | Inquiry["urgency"];
  /** trueのとき、誰も対応着手していない（claimがない）未対応件のみに絞り込む */
  unclaimedOnly: boolean;
  /** 対応中フラグ（claim）の対応者名で絞り込む。空文字は絞り込みなし */
  claimedBy: string;
  /** trueのとき、未解決（new・in_progress）の問い合わせのみに絞り込む */
  unresolvedOnly: boolean;
  /** 受付からの滞留時間で絞り込む。空文字は絞り込みなし */
  aging: "" | InquiryAgingFilterValue;
  /** 受付日（日本時間基準のYYYY-MM-DD）で絞り込む。空文字は絞り込みなし */
  receivedOn: string;
}

export const EMPTY_HELPDESK_INQUIRY_FILTERS: HelpdeskInquiryFilters = {
  companyName: "",
  keyword: "",
  country: "",
  category: "",
  status: "",
  urgency: "",
  unclaimedOnly: false,
  claimedBy: "",
  unresolvedOnly: false,
  aging: "",
  receivedOn: "",
};

/**
 * ヘルプデスク側フィルタの相互排他ルールを一括で正規化する。
 *
 * 個々のクリックハンドラ・フィルタバーのコントロールがそれぞれ「関連するキーだけ」を
 * 都度調整する対症療法では、別の経路（他のコントロール）から片方だけが変更されると
 * 両立不可能な組み合わせに戻ってしまう。例えば対応者行クリックで
 * `unresolvedOnly:true`にした後、対応状況セレクトで`status="resolved"`を選ぶと
 * `unresolvedOnly`だけが解除され、再度同じ対応者行をクリックしても
 * （`toggleFilterPatch`の一致判定が崩れているため）矛盾が解消されず
 * フィルタが「詰み」状態になる。
 *
 * このため、フィルタ変更の都度、最終的な`HelpdeskInquiryFilters`オブジェクト全体を
 * 本関数へ通し、常に内部一貫性を保つ（呼び出し元の`toggleFilterPatch`やフィルタバーの
 * 個別ハンドラに残っている調整ロジックは、この関数が最終的に同じ結果へ収束させるため
 * 残っていても害はない）。
 *
 * `changedKeys`には、今回のsetFiltersのトリガーとなった変更（`onFilterChange`の
 * patchのキー、またはフィルタバーで実際に値が変わったキー）を渡す。矛盾が生じた際は
 * 「今回明示的に変更されたキー」の意図を優先し、矛盾するもう一方のキーを解除する
 * （例: 対応状況をresolvedに変更したときはunresolvedOnlyを解除し、逆に未解決のみを
 * ONにしたときはstatus=resolvedを解除する）。
 */
export function normalizeHelpdeskInquiryFilters(
  filters: HelpdeskInquiryFilters,
  changedKeys: readonly (keyof HelpdeskInquiryFilters)[] = []
): HelpdeskInquiryFilters {
  const next = { ...filters };
  const changed = new Set<keyof HelpdeskInquiryFilters>(changedKeys);

  // 未着手（claim===null）と対応者指定（claim.staffName===X）は両立しない。
  if (next.unclaimedOnly && next.claimedBy !== "") {
    if (changed.has("claimedBy") && !changed.has("unclaimedOnly")) {
      next.unclaimedOnly = false;
    } else {
      next.claimedBy = "";
    }
  }

  // 未着手・滞留時間・国別はいずれも「未解決のみ」を母集団にした集計
  // （unclaimed・unresolvedAging・byCountry）と対になっているため、
  // 有効な間はunresolvedOnlyも常にtrueでなければならない。
  // （`claimedBy`はここに含めない。対応者による絞り込み自体は対応状況を問わず
  // 意味を持つ操作であり、`stats.mine`/`claimedByStaff`が未解決限定の集計である
  // ことは別の実装都合であって、フィルタの意味論上の制約ではないため。）
  const requiresUnresolved = next.unclaimedOnly || next.aging !== "" || next.country !== "";
  if (requiresUnresolved && !next.unresolvedOnly) {
    if (changed.has("unresolvedOnly")) {
      // unresolvedOnlyが明示的にオフにされた: 前提を欠く依存項目側を解除する
      next.unclaimedOnly = false;
      next.aging = "";
      next.country = "";
    } else {
      next.unresolvedOnly = true;
      changed.add("unresolvedOnly");
    }
  }

  // 対応状況「解決済み」と未解決のみは両立しない。
  if (next.status === "resolved" && next.unresolvedOnly) {
    if (changed.has("unresolvedOnly") && !changed.has("status")) {
      next.status = "";
    } else {
      next.unresolvedOnly = false;
      if (next.unclaimedOnly || next.aging !== "" || next.country !== "") {
        next.unclaimedOnly = false;
        next.aging = "";
        next.country = "";
      }
    }
  }

  return next;
}

/**
 * 会社名・キーワード・国・カテゴリ・対応状況・緊急度・未着手・対応者・未解決・滞留時間・受付日の
 * AND条件で問い合わせを絞り込む。会社名・キーワードは大文字小文字を区別しない部分一致とする。
 * キーワードはタイトル（title）・自由記述本文（originalText）のいずれかに
 * 部分一致すれば対象とする。
 *
 * `unclaimedOnly`はresolvedを対象母集団から除外しない仕様（対応中フラグの有無のみで判定）。
 * KPI集計（`computeHelpdeskInquiryStats`）の「未着手」は未対応（new・in_progress）のみを
 * 対象とするため、KPIとクリック後の一覧件数を一致させたい場合は`unresolvedOnly`を併用すること。
 */
export function filterInquiriesForHelpdesk(
  inquiries: Inquiry[],
  filters: HelpdeskInquiryFilters,
  context?: { referenceDate?: Date }
): Inquiry[] {
  const companyName = filters.companyName.trim().toLowerCase();
  const keyword = filters.keyword.trim().toLowerCase();
  const referenceDate = context?.referenceDate ?? new Date();

  return inquiries.filter((inquiry) => {
    if (
      companyName &&
      !inquiry.submittedBy.companyName.toLowerCase().includes(companyName)
    ) {
      return false;
    }
    if (
      keyword &&
      !inquiry.title.toLowerCase().includes(keyword) &&
      !inquiry.originalText.toLowerCase().includes(keyword)
    ) {
      return false;
    }
    if (filters.country && inquiry.submittedBy.country !== filters.country) {
      return false;
    }
    if (filters.category && inquiry.category !== filters.category) {
      return false;
    }
    if (filters.status && inquiry.status !== filters.status) {
      return false;
    }
    if (filters.urgency && inquiry.urgency !== filters.urgency) {
      return false;
    }
    if (filters.unclaimedOnly && inquiry.claim != null) {
      return false;
    }
    if (filters.claimedBy && inquiry.claim?.staffName !== filters.claimedBy) {
      return false;
    }
    if (filters.unresolvedOnly && !UNRESOLVED_STATUSES.includes(inquiry.status)) {
      return false;
    }
    if (filters.aging && !matchesInquiryAging(inquiry.createdAt, referenceDate, filters.aging)) {
      return false;
    }
    if (
      filters.receivedOn &&
      toReferenceDateKey(new Date(inquiry.createdAt)) !== filters.receivedOn
    ) {
      return false;
    }
    return true;
  });
}
