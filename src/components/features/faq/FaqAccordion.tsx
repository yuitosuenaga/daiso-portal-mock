"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { isRecentlyUpdated } from "@/lib/faq-utils";
import type { Faq } from "@/types/faq";

interface FaqAccordionProps {
  faqs: Faq[];
  /** 更新日整形に用いるロケール（`toLocaleDateString`へ渡す）。 */
  locale: string;
  /** 更新日ラベル（例: 「更新日」）。 */
  updatedLabel: string;
  /** 新着バッジの文言（例: 「新着」）。 */
  newBadgeLabel: string;
}

/**
 * 質問配列を受け取り、クリックまたはキーボード操作で回答の表示/非表示を切り替える。
 * `type="multiple"` により、各質問の展開状態は他の質問と独立して保持され、
 * 複数の質問を同時に展開できる（要件3.3）。
 * 初期状態は`defaultValue`を渡さないため、すべての質問が折りたたまれた状態になる（要件3.1）。
 * キーボード操作（Enter/Space）での開閉・`aria-expanded`の付与はRadixプリミティブが
 * 標準で提供するため、本コンポーネントでの追加実装は不要（要件3.4, 3.5）。
 * 各質問には、折りたたみ状態でも見える更新日・新着バッジを表示する（要件9.2, 9.3, 9.4）。
 * `AccordionTrigger`の子要素は質問文のみとし（既存のアクセシブルネームを維持）、
 * 更新日・新着バッジはトリガーの外側（ヘッダー相当の行）に配置する。
 * 回答は改行・連続する空白を保持しつつ長い行を折り返して表示する（要件8.1, 8.2）。
 */
export function FaqAccordion({
  faqs,
  locale,
  updatedLabel,
  newBadgeLabel,
}: FaqAccordionProps) {
  return (
    <Accordion type="multiple">
      {faqs.map((faq) => {
        const isNew = isRecentlyUpdated(faq.updatedAt);
        return (
          <AccordionItem key={faq.id} value={faq.id}>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
              {isNew && <Badge variant="default">{newBadgeLabel}</Badge>}
              <time dateTime={faq.updatedAt}>
                {updatedLabel}:{" "}
                {new Date(faq.updatedAt).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>
              <p className="whitespace-pre-wrap break-words">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
