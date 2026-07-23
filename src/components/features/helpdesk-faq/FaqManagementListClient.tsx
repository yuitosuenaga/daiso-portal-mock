"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { filterFaqs } from "@/lib/faq-utils";
import { FAQ_MANAGEMENT_PAGE_SIZE } from "@/lib/constants/faq";
import { DeleteFaqButton } from "@/components/features/helpdesk-faq/DeleteFaqButton";
import {
  FaqManagementFilterBar,
  type FaqManagementFilters,
} from "@/components/features/helpdesk-faq/FaqManagementFilterBar";
import { FaqManagementPagination } from "@/components/features/helpdesk-faq/FaqManagementPagination";
import {
  ManagementListCard,
  ManagementListRow,
  ManagementListRows,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { Faq } from "@/types/faq";

export interface FaqManagementListClientProps {
  /** 登録日（`createdAt`）降順で整列済みの全FAQ */
  faqs: Faq[];
  locale: string;
  listTitle: string;
}

/** 削除確認モーダルの本文に埋め込む質問文の最大表示文字数（超過分は省略表示、要件11.2）。 */
const CONFIRM_QUESTION_MAX_LENGTH = 60;

function truncateQuestion(question: string): string {
  if (question.length <= CONFIRM_QUESTION_MAX_LENGTH) {
    return question;
  }
  return `${question.slice(0, CONFIRM_QUESTION_MAX_LENGTH)}…`;
}

const INITIAL_FILTERS: FaqManagementFilters = {
  keyword: "",
  category: "all",
};

/**
 * FAQ管理一覧のキーワード・カテゴリの絞り込み状態とページネーション状態を保持し、
 * 絞り込み済み・ページ分割済みの一覧を描画するコンポーネント。
 * `DocumentManagementListClient`と同一の設計方針を踏襲する（要件10）。
 * キーワード絞り込みは`faq`spec所有の`filterFaqs`を再利用する（重複実装を避ける）。
 */
export function FaqManagementListClient({
  faqs,
  locale,
  listTitle,
}: FaqManagementListClientProps) {
  const t = useTranslations("helpdeskFaq.list");
  const tFilter = useTranslations("helpdeskFaq.list.filter");
  const tCategories = useTranslations("faq.categories");
  const [filters, setFilters] = useState<FaqManagementFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  const filteredFaqs = useMemo(() => {
    const byKeyword = filterFaqs(faqs, filters.keyword);
    if (filters.category === "all") {
      return byKeyword;
    }
    return byKeyword.filter((faq) => faq.category === filters.category);
  }, [faqs, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFaqs.length / FAQ_MANAGEMENT_PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const pagedFaqs = filteredFaqs.slice(
    (currentPage - 1) * FAQ_MANAGEMENT_PAGE_SIZE,
    currentPage * FAQ_MANAGEMENT_PAGE_SIZE
  );

  function handleFiltersChange(next: FaqManagementFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleClear() {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <FaqManagementFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClear}
      />
      {filteredFaqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tFilter("noResults")}</p>
      ) : (
        <>
          <ManagementListCard title={listTitle}>
            <ManagementListRows>
              {pagedFaqs.map((faq) => (
                <ManagementListRow key={faq.id}>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{faq.question}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{tCategories(faq.category)}</span>
                      <time dateTime={faq.createdAt}>
                        {new Date(faq.createdAt).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/helpdesk/faq/${faq.id}/edit`}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {t("editLink")}
                    </Link>
                    <DeleteFaqButton
                      faqId={faq.id}
                      deleteButtonLabel={t("deleteButton")}
                      confirmTitle={t("deleteConfirmTitle")}
                      confirmMessage={t("deleteConfirm", {
                        question: truncateQuestion(faq.question),
                      })}
                      confirmButtonLabel={t("deleteConfirmButton")}
                      cancelButtonLabel={t("deleteCancelButton")}
                      errorMessage={t("deleteError")}
                    />
                  </div>
                </ManagementListRow>
              ))}
            </ManagementListRows>
          </ManagementListCard>
          <FaqManagementPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
