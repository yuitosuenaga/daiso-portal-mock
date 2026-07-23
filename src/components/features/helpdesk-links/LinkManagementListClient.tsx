"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { filterLinks } from "@/lib/link-utils";
import { LINK_MANAGEMENT_PAGE_SIZE } from "@/lib/constants/link-options";
import { DeleteLinkButton } from "@/components/features/helpdesk-links/DeleteLinkButton";
import {
  LinkManagementFilterBar,
  type LinkManagementFilters,
} from "@/components/features/helpdesk-links/LinkManagementFilterBar";
import { LinkManagementPagination } from "@/components/features/helpdesk-links/LinkManagementPagination";
import {
  ManagementListCard,
  ManagementListRow,
  ManagementListRows,
} from "@/components/features/helpdesk-shared/ManagementList";
import type { LinkWithTimestamp } from "@/types/link";

export interface LinkManagementListClientProps {
  /** 登録日降順で整列済みの全リンク */
  links: LinkWithTimestamp[];
  locale: string;
  listTitle: string;
  editLinkLabel: string;
}

const INITIAL_FILTERS: LinkManagementFilters = { keyword: "", category: "all" };

/**
 * リンク管理一覧のキーワード・カテゴリ絞り込み状態とページネーション状態を保持し、
 * 絞り込み済み・ページ分割済みの一覧を描画するコンポーネント。
 * `documents-management`の`DocumentManagementListClient`と同型。
 */
export function LinkManagementListClient({
  links,
  locale,
  listTitle,
  editLinkLabel,
}: LinkManagementListClientProps) {
  const t = useTranslations("helpdeskLinks.list.filter");
  const tList = useTranslations("helpdeskLinks.list");
  const tCategories = useTranslations("links.categories");
  const [filters, setFilters] = useState<LinkManagementFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  const filteredLinks = useMemo(() => {
    const byKeyword = filterLinks(links, filters.keyword);
    return byKeyword.filter(
      (link) => filters.category === "all" || link.category === filters.category
    );
  }, [links, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLinks.length / LINK_MANAGEMENT_PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const pagedLinks = filteredLinks.slice(
    (currentPage - 1) * LINK_MANAGEMENT_PAGE_SIZE,
    currentPage * LINK_MANAGEMENT_PAGE_SIZE
  );

  function handleFiltersChange(next: LinkManagementFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleClear() {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <LinkManagementFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClear}
      />
      {filteredLinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <>
          <ManagementListCard title={listTitle}>
            <ManagementListRows>
              {pagedLinks.map((link) => (
                <ManagementListRow key={link.id}>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{link.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{link.url}</span>
                      <span>{tCategories(link.category)}</span>
                      <time dateTime={link.createdAt}>
                        {new Date(link.createdAt).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/helpdesk/links/${link.id}/edit`}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {editLinkLabel}
                    </Link>
                    <DeleteLinkButton
                      linkId={link.id}
                      title={link.title}
                      deleteButtonLabel={tList("deleteButton")}
                      confirmTitle={tList("deleteConfirmTitle")}
                      confirmMessage={tList("deleteConfirm", { title: link.title })}
                      confirmButtonLabel={tList("deleteConfirmButton")}
                      cancelButtonLabel={tList("deleteCancelButton")}
                      errorMessage={tList("deleteError")}
                    />
                  </div>
                </ManagementListRow>
              ))}
            </ManagementListRows>
          </ManagementListCard>
          <LinkManagementPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
