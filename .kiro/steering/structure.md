# ディレクトリ構成

## ソースディレクトリ

```
src/
  app/
    [locale]/
      (applicant)/          # 申請者側ルート（ダッシュボード・inquiry・announcements・documents・links・faq）
      helpdesk/              # ヘルプデスク側ルート（各管理画面）
      login/                 # ログイン画面
    api/
      auth/                  # Auth.js（NextAuth）ルートハンドラ
      inquiries/             # 問い合わせ関連APIルート
  components/
    ui/                      # 汎用UI（shadcn/ui）
    layout/                  # Header/Sidebar/HelpdeskSidebar等
    features/
      auth/                  # ログイン関連
      dashboard/             # 両ポータルのダッシュボードカード・プレビューパネル
      inquiry-form/          # 問い合わせ・申請フォーム関連
      inquiry-list/          # 問い合わせ一覧・詳細（自社の問い合わせ確認）
      announcements/         # お知らせ・情報共有（申請者側）
      documents/             # ドキュメント閲覧（申請者側）
      links/                 # リンク集（申請者側）
      faq/                   # FAQ（申請者側）
      helpdesk-inquiries/    # 問い合わせ管理（ヘルプデスク側）
      helpdesk-announcements/# お知らせ管理（ヘルプデスク側）
      helpdesk-documents/    # ドキュメント管理（ヘルプデスク側）
      helpdesk-links/        # リンク集管理（ヘルプデスク側）
      helpdesk-faq/          # FAQ管理（ヘルプデスク側）
      helpdesk-templates/    # 返信テンプレート管理（ヘルプデスク側）
      helpdesk-shared/       # ヘルプデスク側共通コンポーネント
  lib/
    actions/                 # Server Actions
    api/                     # データアクセス関数（Prisma経由。旧モックAPIから実DB接続に差し替え済み）
    db/                      # Prismaクライアント等
    server/                  # セッション・ルート保護等サーバー専用ロジック
    validation/              # zodスキーマ
    constants/                # 定数
    test/                    # テストユーティリティ
  types/                     # 型定義
  i18n/                      # next-intlルーティング設定（対応ロケール定義）
messages/                    # 多言語ファイル（ja.json, en.json）— リポジトリ直下（src/配下ではない）
prisma/
  schema.prisma              # DBスキーマ（PostgreSQL）
  seed.ts                    # 初期データ投入スクリプト
```

## データ構造（Prisma実装済み。`prisma/schema.prisma`が正）

フェーズ3（PR #32）でPostgreSQL・Prisma ORMによる実装に差し替え済み。以下は`Inquiry`モデルの主要フィールド（詳細・他モデルは`prisma/schema.prisma`を参照）:

```prisma
model Inquiry {
  id                     String   @id @default(cuid())
  title                  String   @default("")
  category               InquiryCategory   // 案件種別（仮。ヒアリング未反映のまま本番DBに存在）
  urgency                InquiryUrgency
  storeRegion            String
  originalText           String            // 自由記述（原文）
  originalLanguage       String            // ISO 639-1 言語コード（例: "th", "vi", "en"）
  translatedText         String?           // 日本語訳。Google Cloud Translation API連携は未実装のまま
  status                 InquiryStatus     @default(new)
  createdAt              DateTime          @default(now())
  companyId              String
  submittedByCompanyName String
  submittedByCountry     String
  claimedByStaffId       String?           // ヘルプデスク担当者による対応中フラグ
  claimedAt              DateTime?
  attachments            InquiryAttachment[]
  history                InquiryHistoryEntry[]
}
```

> 注: `category`（`InquiryCategory` enum）はヘルプデスク担当者へのヒアリング後に変更される前提の仮値のままフェーズ3のDBスキーマに固定化されている。ヒアリング結果が出たら、enum・マイグレーション・フォームの選択肢を最初に更新すること（変更は既存specへの要件追記として行う。`CLAUDE.md`のspec管理ルール参照）。

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
