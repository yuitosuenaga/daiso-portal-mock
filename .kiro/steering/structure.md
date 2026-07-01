# ディレクトリ構成

## ソースディレクトリ

```
src/
  app/                     # Next.js App Router（ルーティング）
  components/
    ui/                    # 汎用UI（shadcn/ui）
    features/
      inquiry-form/        # 問い合わせ・申請フォーム関連
      announcements/       # お知らせ・情報共有
      links/               # リンク集
      faq/                 # FAQ
  lib/
    api/                   # モックAPI関数（将来バックエンドに差し替え）
    validation/            # zodスキーマ
  types/                   # 型定義
  messages/                # 多言語ファイル（en.json, ja.json ...）
```

## データ構造（仮定義・フェーズ3で本実装）

```typescript
// types/inquiry.ts
export type Inquiry = {
  id: string;
  category: "defect" | "order" | "system" | "other"; // 案件種別（仮。ヒアリング後に調整）
  urgency: "high" | "medium" | "low";
  storeRegion: string;
  originalText: string;          // 自由記述（原文）
  originalLanguage: string;      // ISO 639-1 言語コード（例: "th", "vi", "en"）
  translatedText?: string;       // 日本語訳。フェーズ3(Google Cloud Translation API連携)まで未使用
  status: "new" | "in_progress" | "resolved";
  createdAt: string;
  submittedBy: {
    companyName: string;
    country: string;
  };
};
```

> 注: `category` の選択肢はヘルプデスク担当者へのヒアリング後に変更される前提の仮値です。
> ヒアリング結果が出たら、この型定義とフォームの選択肢を最初に更新すること。

## spec-driven開発の仕様書配置

```
.kiro/
  steering/       # プロジェクト全体の前提・ルール
    product.md    # プロダクト概要・主要機能
    tech.md       # 技術スタック・コーディング規約
    structure.md  # ディレクトリ構成・データ構造
  specs/          # 機能単位の仕様書
    <機能名>/
      spec.json
      requirements.md
      design.md
      tasks.md
```
