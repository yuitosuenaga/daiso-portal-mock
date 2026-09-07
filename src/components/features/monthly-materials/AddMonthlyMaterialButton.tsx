"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MonthlyMaterialForm,
  type MonthlyMaterialFormProps,
} from "@/components/features/monthly-materials/MonthlyMaterialForm";
import type { MonthlyMaterialCategory } from "@/types/monthly-material";

export interface AddMonthlyMaterialButtonProps {
  category: MonthlyMaterialCategory;
  addButtonLabel: string;
  formLabels: Omit<
    MonthlyMaterialFormProps,
    "category" | "mode" | "materialId" | "defaultValues" | "onCancel" | "onSuccess"
  >;
}

/**
 * クリックすると一覧の先頭に新規登録フォーム（`MonthlyMaterialForm`, `mode="create"`）を
 * インライン表示するトグルボタン。別ルート（`/new`）は持たず、同一画面内で完結する（要件8.1）。
 */
export function AddMonthlyMaterialButton({
  category,
  addButtonLabel,
  formLabels,
}: AddMonthlyMaterialButtonProps) {
  const [isAdding, setIsAdding] = useState(false);

  if (isAdding) {
    return (
      <MonthlyMaterialForm
        category={category}
        mode="create"
        onCancel={() => setIsAdding(false)}
        onSuccess={() => setIsAdding(false)}
        {...formLabels}
      />
    );
  }

  return (
    <Button type="button" onClick={() => setIsAdding(true)}>
      {addButtonLabel}
    </Button>
  );
}
