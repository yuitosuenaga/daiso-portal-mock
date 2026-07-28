"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { SelectOption } from "@/components/ui/select";
import { targetingLabel, type TargetingLabelDictionary } from "@/lib/document-utils";
import {
  ManagementListCard,
  ManagementListMessageCard,
  ManagementListRow,
  ManagementListRows,
} from "@/components/features/helpdesk-shared/ManagementList";
import {
  DocumentCategoryFormDialog,
  type DocumentCategoryDialogState,
} from "@/components/features/helpdesk-document-categories/DocumentCategoryFormDialog";
import { DeleteDocumentCategoryButton } from "@/components/features/helpdesk-document-categories/DeleteDocumentCategoryButton";
import { DocumentCategoryOrderButtons } from "@/components/features/helpdesk-document-categories/DocumentCategoryOrderButtons";
import type { DocumentCategoryAdminView } from "@/types/document-category";

export interface DocumentCategoryManagementListClientProps {
  categories: DocumentCategoryAdminView[];
  countryOptions: SelectOption[];
  companyOptions: SelectOption[];
  targetingLabels: TargetingLabelDictionary;
}

/**
 * カテゴリ管理画面のクライアント側。大分類行＋配下の中分類行を階層が分かる
 * インデント付きで描画し（要件19.1）、追加/編集/削除/並び替えの各操作コンポーネントを
 * 配置する。自身のUI文字列は`useTranslations`で解決する。
 */
export function DocumentCategoryManagementListClient({
  categories,
  countryOptions,
  companyOptions,
  targetingLabels,
}: DocumentCategoryManagementListClientProps) {
  const t = useTranslations("helpdeskDocumentCategories.list");
  const router = useRouter();
  const [dialogState, setDialogState] = useState<DocumentCategoryDialogState | null>(
    null
  );

  function handleClosed() {
    setDialogState(null);
  }

  function handleSaved() {
    setDialogState(null);
    router.refresh();
  }

  function handleChanged() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setDialogState({ mode: "createParent" })}>
          {t("addParentButton")}
        </Button>
      </div>

      {categories.length === 0 ? (
        <ManagementListMessageCard message={t("empty")} />
      ) : (
        <ManagementListCard title={t("title")}>
          <ManagementListRows>
            {categories.map((category, categoryIndex) => (
              <ManagementListRow key={category.id}>
                <div className="w-full space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{category.name}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{targetingLabel(category.targeting, targetingLabels)}</span>
                        <span>
                          {t("documentCountLabel", { count: category.documentCount })}
                        </span>
                        <span>
                          {t("subCategoryCountLabel", {
                            count: category.children.length,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DocumentCategoryOrderButtons
                        categoryId={category.id}
                        isFirst={categoryIndex === 0}
                        isLast={categoryIndex === categories.length - 1}
                        onMoved={handleChanged}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDialogState({ mode: "createChild", parentId: category.id })
                        }
                      >
                        {t("addChildButton")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogState({ mode: "edit", category })}
                      >
                        {t("editButton")}
                      </Button>
                      <DeleteDocumentCategoryButton
                        categoryId={category.id}
                        name={category.name}
                        documentCount={category.documentCount}
                        childCount={category.children.length}
                        onDeleted={handleChanged}
                      />
                    </div>
                  </div>

                  {category.children.length > 0 && (
                    <ul className="ml-6 space-y-3 border-l border-border pl-4">
                      {category.children.map((child, childIndex) => (
                        <li
                          key={child.id}
                          className="flex flex-wrap items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{child.name}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>
                                {targetingLabel(child.targeting, targetingLabels)}
                              </span>
                              <span>
                                {t("documentCountLabel", { count: child.documentCount })}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <DocumentCategoryOrderButtons
                              categoryId={child.id}
                              isFirst={childIndex === 0}
                              isLast={childIndex === category.children.length - 1}
                              onMoved={handleChanged}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDialogState({ mode: "edit", category: child })
                              }
                            >
                              {t("editButton")}
                            </Button>
                            <DeleteDocumentCategoryButton
                              categoryId={child.id}
                              name={child.name}
                              documentCount={child.documentCount}
                              childCount={0}
                              onDeleted={handleChanged}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ManagementListRow>
            ))}
          </ManagementListRows>
        </ManagementListCard>
      )}

      <DocumentCategoryFormDialog
        state={dialogState}
        countryOptions={countryOptions}
        companyOptions={companyOptions}
        onClose={handleClosed}
        onSaved={handleSaved}
      />
    </div>
  );
}
