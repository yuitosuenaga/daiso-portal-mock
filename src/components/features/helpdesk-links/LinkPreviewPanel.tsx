import { getTranslations } from "next-intl/server";

import { getLinkCategoriesForApplicant } from "@/lib/api/link-categories";
import { getLinks } from "@/lib/api/links";
import {
  LinkPreviewPanelClient,
  type LinkPreviewLocale,
  type LinkPreviewPanelLocaleData,
} from "@/components/features/helpdesk-links/LinkPreviewPanelClient";
import type { LinkWithTimestamp } from "@/types/link";

const PREVIEW_LOCALES: LinkPreviewLocale[] = ["ja", "en"];

/**
 * ヘルプデスク側から申請者側`/links`の実際の表示を確認できるプレビュー機能（要件16）。
 * `ja`・`en`両方のロケール解決済みデータを事前に取得しておき、クライアント側の言語タブ切り替えで
 * 再取得を行わない構成にする（要件16.4・16.5）。
 */
export async function LinkPreviewPanel() {
  const t = await getTranslations("helpdeskLinks.preview");

  let links: LinkWithTimestamp[] = [];
  let hasError = false;
  const dataByLocale = {} as Record<LinkPreviewLocale, LinkPreviewPanelLocaleData>;

  try {
    const [fetchedLinks, ...localeResults] = await Promise.all([
      getLinks(),
      ...PREVIEW_LOCALES.map(async (locale) => {
        const [categories, tLinks] = await Promise.all([
          getLinkCategoriesForApplicant(locale),
          getTranslations({ locale, namespace: "links" }),
        ]);

        return {
          locale,
          categories,
          opensInNewTabLabel: tLinks("item.opensInNewTab"),
          newBadgeLabel: tLinks("item.newBadge"),
          uncategorizedLabel: tLinks("uncategorized"),
          emptyLabel: tLinks("list.empty"),
        };
      }),
    ]);

    links = fetchedLinks;
    for (const result of localeResults) {
      dataByLocale[result.locale] = {
        categories: result.categories,
        opensInNewTabLabel: result.opensInNewTabLabel,
        newBadgeLabel: result.newBadgeLabel,
        uncategorizedLabel: result.uncategorizedLabel,
        emptyLabel: result.emptyLabel,
      };
    }
  } catch {
    hasError = true;
    for (const locale of PREVIEW_LOCALES) {
      dataByLocale[locale] = {
        categories: [],
        opensInNewTabLabel: "",
        newBadgeLabel: "",
        uncategorizedLabel: "",
        emptyLabel: "",
      };
    }
  }

  return (
    <LinkPreviewPanelClient
      links={links}
      dataByLocale={dataByLocale}
      hasError={hasError}
      triggerLabel={t("triggerButton")}
      dialogTitle={t("dialogTitle")}
      localeTabLabels={{ ja: t("localeTabJa"), en: t("localeTabEn") }}
      errorMessage={t("error")}
    />
  );
}
