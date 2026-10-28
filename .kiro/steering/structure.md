# ディレクトリ構成

## ソースディレクトリ

```
src/
  app/
    [locale]/
      (applicant)/          # 申請者側ルート（ダッシュボード・inquiry・announcements・documents・links・faq・manuals・pop・sales-floor-meeting）
      helpdesk/
        login/               # ヘルプデスク側ログイン画面
        (dashboard)/         # ヘルプデスク側の管理画面（announcements・companies・documents・faq・inquiries・inquiry・links・manuals・pop・sales-floor-meeting・staff・templates）
      login/                 # 申請者側ログイン画面
    api/
      auth/                  # Auth.js（NextAuth）ルートハンドラ
      cron/                  # 保護付き定期実行エンドポイント（announcement-escalation。CRON_SECRET で認証）
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
      helpdesk-companies/    # 販社（会社）管理・アカウント管理（ヘルプデスク側）
      helpdesk-staff/        # 日本側スタッフ管理（ヘルプデスク側、admin 専用）
      helpdesk-manuals/      # マニュアル管理（ヘルプデスク側）
      helpdesk-document-categories/ # ドキュメントカテゴリ管理（ヘルプデスク側）
      manuals/               # マニュアル閲覧（申請者側）
      inquiry-stats/         # 問い合わせ統計の表示部品
      monthly-materials/     # 月次資料（POP・売場会議）
      shared/                # 両ポータル共通の部品
      helpdesk-shared/       # ヘルプデスク側共通コンポーネント
  lib/
    actions/                 # Server Actions
    api/                     # データアクセス関数（Prisma経由。旧モックAPIから実DB接続に差し替え済み）
    auth/                    # 認証ポリシー（Googleログイン・ログイン試行制限など）
    db/                      # Prismaクライアント等
    server/                  # セッション・ルート保護・各種サービス等サーバー専用ロジック
    translation/             # 自動翻訳（Claude API。claude-translator.ts）
    validation/              # zodスキーマ
    constants/                # 定数
    test/                    # テストユーティリティ
  types/                     # 型定義
  i18n/                      # next-intlルーティング設定（対応ロケール定義）
messages/                    # 多言語ファイル（ja・en・es・pt・th・vi・zh・zh-TW の8言語）— リポジトリ直下（src/配下ではない）
prisma/
  schema.prisma              # DBスキーマ（PostgreSQL）
  seed.ts                    # 初期データ投入スクリプト
  migrations/                # マイグレーション（適用済みの名前は変更しない）
```

### マイグレーション名の付け方

- 新規マイグレーション名は、既存の最大値（`ls prisma/migrations | tail -2`）より大きいタイムスタンプにする
- `20261029000000_add_helpdesk_staff_is_active` は手で付けた未来日付である。その日時（UTC）より前にマイグレーションを作るときは、`20261029000001_...` のように手で調整する
- 順序が逆になると、新しい DB（dev・クライアント環境）で適用順が本番と変わる
- 適用済みの名前のリネームはしない（適用履歴と食い違う）

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
  translatedText         String?           // 日本語訳。Claude APIによる自動翻訳（src/lib/translation/claude-translator.ts）
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

> 注: `category`（`InquiryCategory` enum）はヘルプデスク担当者へのヒアリング後に変更される前提の仮値のままフェーズ3のDBスキーマに固定化されている。ヒアリング結果が出たら、enum・マイグレーション・フォームの選択肢を最初に更新すること（kiro の spec 駆動フローは廃止済みのため、変更はこの steering と `prisma/schema.prisma` を直接更新して行う）。

## kiro 配下の仕様書配置（過去の記録）

kiro の spec 駆動フローは廃止済み。`.kiro/specs/` は過去の記録として残し、更新・新規作成はしない。

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
