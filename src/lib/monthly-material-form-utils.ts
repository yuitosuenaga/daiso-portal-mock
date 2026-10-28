import type { MonthlyMaterialSummary } from "@/types/monthly-material";
import type { MonthlyMaterialFormValues } from "@/lib/validation/monthly-material";

/**
 * `MonthlyMaterialSummary`（一覧用の型、`dataUrl`なし）を`MonthlyMaterialForm`の初期値（`MonthlyMaterialFormValues`）へ
 * 変換する。Server ComponentからClient Componentへ関数をpropsで渡すことはできないため
 * （シリアライズ不可）、呼び出し元（Client Component）がこの純粋関数を直接importして使う。
 */
export function toMonthlyMaterialFormDefaultValues(
  material: MonthlyMaterialSummary
): MonthlyMaterialFormValues {
  const base = {
    category: material.category,
    department: material.department,
    year: material.year,
    month: material.month,
    targeting: material.targeting as MonthlyMaterialFormValues["targeting"],
  };

  if (material.sourceType === "google") {
    return {
      ...base,
      sourceType: "google",
      googleUrl: material.googleUrl,
      googleEmbedUrl: material.googleEmbedUrl,
    };
  }

  return {
    ...base,
    sourceType: "upload",
    fileName: material.fileName,
    fileType: material.fileType,
    fileSize: material.fileSize,
    // 一覧はファイル本体を持たない。空のままにしておき、フォームは差し替えない限り`dataUrl`を
    // 送らない（サーバー側は既存ファイルを保持して更新する）。
    dataUrl: "",
  };
}
