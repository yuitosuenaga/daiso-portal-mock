import type { Manual, ManualTargeting } from "@/types/manual";

export interface ManualTargetingLabelDictionary {
  allLabel: string;
  countriesLabel: string;
  companiesLabel: string;
  countryLabels: Record<string, string>;
  companyLabels: Record<string, string>;
}

/**
 * 公開範囲（ManualTargeting）を、ヘルプデスク画面向けの表示用ラベル文字列に整形する。
 * `document-utils.ts`の`targetingLabel`と同型のパターン。
 */
export function manualTargetingLabel(
  targeting: ManualTargeting,
  labels: ManualTargetingLabelDictionary
): string {
  if (targeting.scope === "all") {
    return labels.allLabel;
  }
  if (targeting.scope === "countries") {
    return `${labels.countriesLabel}: ${targeting.countries
      .map((code) => labels.countryLabels[code] ?? code)
      .join(", ")}`;
  }
  return `${labels.companiesLabel}: ${targeting.companyCodes
    .map((code) => labels.companyLabels[code] ?? code)
    .join(", ")}`;
}

/**
 * タイトル・説明の部分一致（大文字小文字を区別しない）でマニュアルを絞り込む。
 * キーワードが空のとき、入力配列をそのまま（順序維持で）返す
 * （`document-utils.ts`の`filterDocuments`と同型）。
 */
export function filterManuals(manuals: Manual[], keyword: string): Manual[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return manuals;
  }

  return manuals.filter((manual) => {
    const title = manual.title.toLowerCase();
    const description = manual.description?.toLowerCase() ?? "";
    return (
      title.includes(normalizedKeyword) || description.includes(normalizedKeyword)
    );
  });
}

/**
 * 指定した言語に対応するマニュアルのタイトルを解決する。`locale`が`ja`のときは
 * `manual.title`を返す。それ以外は`manual.translations`から`locale`が一致する行を探し、
 * 見つかればその内容を返す。一致する翻訳が無い場合は`manual.title`（ja）へフォールバックする
 * （サーバー側の`resolveManualContent`と異なり、クライアント側で解決済みでないタイトルの
 * 表示用に使う軽量版）。
 */
export function resolveManualTitle(manual: Manual, locale: string): string {
  if (locale === "ja") {
    return manual.title;
  }

  const translation = manual.translations.find((item) => item.locale === locale);
  return translation?.title ?? manual.title;
}
