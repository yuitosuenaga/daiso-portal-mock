"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Faq } from "@/types/faq";

interface FaqAccordionProps {
  faqs: Faq[];
}

/**
 * 質問配列を受け取り、クリックまたはキーボード操作で回答の表示/非表示を切り替える。
 * `type="multiple"` により、各質問の展開状態は他の質問と独立して保持され、
 * 複数の質問を同時に展開できる（要件3.3）。
 * 初期状態は`defaultValue`を渡さないため、すべての質問が折りたたまれた状態になる（要件3.1）。
 * キーボード操作（Enter/Space）での開閉・`aria-expanded`の付与はRadixプリミティブが
 * 標準で提供するため、本コンポーネントでの追加実装は不要（要件3.4, 3.5）。
 */
export function FaqAccordion({ faqs }: FaqAccordionProps) {
  return (
    <Accordion type="multiple">
      {faqs.map((faq) => (
        <AccordionItem key={faq.id} value={faq.id}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
