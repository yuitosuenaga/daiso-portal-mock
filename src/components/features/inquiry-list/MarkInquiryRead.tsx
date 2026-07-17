"use client";

import { useEffect } from "react";

import { markInquiryReadAction } from "@/lib/actions/inquiry";

export interface MarkInquiryReadProps {
  inquiryId: string;
}

/**
 * 問い合わせ詳細画面のマウント時に既読記録用Server Action
 * （`markInquiryReadAction`）を1度呼び出す、描画を持たないコンポーネント。
 * 既読記録の失敗は詳細画面の表示を妨げないよう、エラーは握りつぶす。
 */
export function MarkInquiryRead({ inquiryId }: MarkInquiryReadProps) {
  useEffect(() => {
    markInquiryReadAction(inquiryId).catch(() => {
      // 既読記録の失敗は詳細画面の表示を妨げない（意図的に握りつぶす）
    });
  }, [inquiryId]);

  return null;
}
