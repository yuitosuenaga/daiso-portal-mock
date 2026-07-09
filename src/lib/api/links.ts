import { Link } from "@/types/link";

const MOCK_LINKS: Link[] = [
  {
    id: "1",
    title: "社内ポータル（グループウェア）",
    url: "https://example.com/internal/groupware",
    category: "internal",
    description: "スケジュール管理・社内連絡に使用する社内ポータルです。",
  },
  {
    id: "2",
    title: "販売管理システム",
    url: "https://example.com/internal/sales-system",
    category: "internal",
    description: "受発注状況・在庫状況を確認できる販売管理システムです。",
  },
  {
    id: "3",
    title: "勤怠管理システム",
    url: "https://example.com/internal/attendance",
    category: "internal",
  },
  {
    id: "4",
    title: "Daiso公式サイト",
    url: "https://example.com/external/daiso-official",
    category: "external",
    description: "商品情報・店舗情報を掲載する公式サイトです。",
  },
  {
    id: "5",
    title: "取引先向けサプライヤーポータル",
    url: "https://example.com/external/supplier-portal",
    category: "external",
    description: "取引先企業との連携に利用する外部ポータルです。",
  },
  {
    id: "6",
    title: "為替レート情報サイト",
    url: "https://example.com/external/exchange-rate",
    category: "external",
  },
  {
    id: "7",
    title: "販社担当者向け業務マニュアル",
    url: "https://example.com/document/operation-manual.pdf",
    category: "document",
    description: "日常業務の手順をまとめたマニュアルです。",
  },
  {
    id: "8",
    title: "問い合わせ対応フローチャート",
    url: "https://example.com/document/inquiry-flowchart.pdf",
    category: "document",
    description: "問い合わせ受付から解決までの対応フローです。",
  },
  {
    id: "9",
    title: "よくある質問集（FAQ）",
    url: "https://example.com/document/faq.pdf",
    category: "document",
  },
  {
    id: "10",
    title: "本社連絡先一覧",
    url: "https://example.com/other/contact-list",
    category: "other",
    description: "各拠点の本社窓口の連絡先一覧です。",
  },
  {
    id: "11",
    title: "システム利用規約",
    url: "https://example.com/other/terms-of-use",
    category: "other",
  },
];

/**
 * リンク全件を返す。並び順の保証はなく、カテゴリ別グループ化は呼び出し側の責務とする。
 */
export async function getLinks(): Promise<Link[]> {
  return Promise.resolve(MOCK_LINKS);
}
