# 技術設計書: dashboard

## 概要

ヘルプデスクポータルのダッシュボード機能は、全ページ共通のシェルレイアウト（ヘッダー・サイドバーナビゲーション・メインコンテンツ領域）と、ポータルのエントリーポイントとなるダッシュボードトップページを提供する。後続のすべての機能スペック（`inquiry-form`・`announcements`・`links-page`・`faq`）はこのシェルを継承するため、本仕様がポータル全体の技術的基盤となる。

**ユーザー**: 海外販社担当者（20か国以上）が日本語または英語でポータルにアクセスし、お知らせと問い合わせ状況をダッシュボードで即座に把握する。

### Goals

- PC・タブレット対応の一貫したレイアウトシェルを全ページに提供する
- next-intl による日本語・英語切り替えをUI全テキストに反映する
- ダッシュボードトップページでお知らせ概要と問い合わせステータス概要を表示する
- フェーズ3のバックエンドAPI差し替えに耐えるモック連携インターフェースを確立する
- （追記）自社の直近の問い合わせ・よく使うリンク・FAQピックアップを追加し、お知らせの表示情報を強化することで、ダッシュボード単体で把握できる情報量を増やす

### Non-Goals

- モバイル（767px未満）への完全最適化
- 認証・ログイン機能（フェーズ2以降）
- 各機能ページの詳細実装（`announcements`・`inquiry-form`・`inquiry-list`・`links-page`・`faq` 仕様が担当）
- バックエンドAPIの実装
- （追記）ログイン中の利用者・会社に関するコンテキスト表示（検討したが対象外と判断）
- （追記）問い合わせ・お知らせ・リンク・FAQの新規データモデル・モックAPIの追加（既存モックAPIをすべて再利用する）

---

## スコープ境界

### This Spec Owns

- `app/[locale]/layout.tsx`: AppShell配置・next-intl Provider設定
- `components/layout/`: Header・Sidebar・LanguageSwitcherコンポーネント
- `app/[locale]/page.tsx`: ダッシュボードトップページ
- `components/features/dashboard/`: ダッシュボードウィジェット群（お知らせ・問い合わせステータス・自社の問い合わせ一覧・よく使うリンク・FAQピックアップ）
- `lib/api/announcements.ts`, `lib/api/inquiries.ts`: モックAPI関数と型インターフェース（初版）
- `types/announcement.ts`, `types/inquiry-summary.ts`: 共有型定義（初版）
- `messages/ja.json`, `messages/en.json`: 翻訳キー（本仕様が初期スキーマを確立し、ダッシュボードウィジェット用キーを追加する）
- `i18n/routing.ts`, `i18n/request.ts`, `middleware.ts`: next-intlルーティング設定

### Out of Boundary

- 各機能ページの実装（`announcements`・`inquiry-form`・`inquiry-list`・`links-page`・`faq` 仕様が担当）
- 問い合わせ・お知らせ・リンク・FAQの型定義およびモックAPIの入出力契約そのもの（各仕様が担当）。本仕様はダッシュボード表示用にそれらを**読み取り専用で参照するのみ**
- 認証・認可処理、ログイン中ユーザー・会社のコンテキスト情報

### Allowed Dependencies

- shadcn/ui: `Card`・`Skeleton`・`Button`・`Badge` コンポーネント
- next-intl: `useTranslations`・`useRouter`・`usePathname`・`useLocale`・`Link`・`NextIntlClientProvider`
- Next.js App Router: `layout.tsx`・`page.tsx`・`Suspense`
- `lib/api/inquiries.ts` の `getInquiries`（`inquiry-form`/`inquiry-list` 仕様が定義）
- `lib/api/links.ts` の `getLinks`（`links-page` 仕様が定義）
- `lib/api/faqs.ts` の `getFaqs`（`faq` 仕様が定義）

### Revalidation Triggers

- `lib/api/announcements.ts` の型インターフェース変更 → `announcements` 仕様との整合性確認が必要
- `lib/api/inquiries.ts`（`getInquiryStatusSummary`・`getInquiries`）の型インターフェース変更 → `inquiry-form`・`inquiry-list` 仕様との整合性確認が必要
- `lib/api/links.ts`・`lib/api/faqs.ts` の型インターフェース変更 → `links-page`・`faq` 仕様との整合性確認が必要
- サイドバーのナビゲーション項目（パス・ラベル）の変更 → 後続仕様のルーティング設計に影響

---

## アーキテクチャ

### Architecture Pattern & Boundary Map

Next.js App Router の **Nested Layouts** パターンを採用する。ルートレイアウト（`app/layout.tsx`）がHTML基盤を提供し、ロケールレイアウト（`app/[locale]/layout.tsx`）がAppShellを配置する。ページコンポーネントはメインコンテンツ領域（`{children}`）にレンダリングされる。

```mermaid
graph TB
    Browser --> Middleware
    Middleware --> RootLayout

    subgraph AppRouter
        RootLayout --> LocaleLayout
        LocaleLayout --> AppShell
    end

    subgraph LayoutLayer
        AppShell --> Header
        AppShell --> Sidebar
        AppShell --> MainContent
    end

    subgraph DashboardFeature
        MainContent --> DashboardPage
        DashboardPage --> AnnouncementWidget
        DashboardPage --> InquiryStatusWidget
        DashboardPage --> RecentInquiriesWidget
        DashboardPage --> QuickLinksWidget
        DashboardPage --> FaqPickWidget
    end

    subgraph MockAPILayer
        AnnouncementWidget --> AnnouncementsAPI
        InquiryStatusWidget --> InquiriesAPI
        RecentInquiriesWidget --> InquiriesAPI
        QuickLinksWidget --> LinksAPI
        FaqPickWidget --> FaqsAPI
    end

    subgraph OtherPages
        MainContent --> PlaceholderPages
    end
```

**依存方向（厳守）**: `types/` → `lib/api/` → `components/features/` → `components/layout/` → `app/[locale]/`

上位レイヤーが下位レイヤーをインポートする方向でのみ依存を許可し、逆方向の参照は禁止する。

### Technology Stack

| Layer | Choice / Version | Role | Notes |
|-------|-----------------|------|-------|
| Frontend | Next.js 14+ App Router | ルーティング・Nested Layouts | `[locale]` ディレクトリ方式 |
| Language | TypeScript strict | 型安全な実装全般 | `any` 使用禁止 |
| Styling | Tailwind CSS + shadcn/ui | レイアウト・UIコンポーネント | レスポンシブは `md:` / `lg:` ブレークポイント |
| i18n | next-intl 3.x | 多言語対応・言語切り替え | `[locale]` ルーティング方式を採用（詳細は `research.md`） |
| State | React `useState` | サイドバー開閉状態のみ | グローバル状態管理ライブラリは不使用 |

---

## File Structure Plan

### Directory Structure

```
src/
├── app/
│   ├── layout.tsx                       # ルートHTML基盤（フォント・メタデータ）
│   ├── globals.css
│   └── [locale]/
│       ├── layout.tsx                   # AppShell配置・NextIntlClientProvider
│       └── page.tsx                     # ダッシュボードトップページ（/ja, /en）
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx                 # Header + Sidebar + main構成のシェル
│   │   ├── Header.tsx                   # ロゴ + LanguageSwitcher
│   │   ├── Sidebar.tsx                  # ナビゲーション（PC展開/タブレットコンパクト）
│   │   └── LanguageSwitcher.tsx         # ja/en 言語切り替えUI
│   └── features/
│       └── dashboard/
│           ├── AnnouncementWidget.tsx      # お知らせ概要ウィジェット（async Server Component。5件・カテゴリバッジ・詳細リンク対応）
│           ├── InquiryStatusWidget.tsx     # 問い合わせステータス概要ウィジェット（async Server Component）
│           ├── RecentInquiriesWidget.tsx   # 自社の直近の問い合わせ一覧ウィジェット（async Server Component、新規）
│           ├── QuickLinksWidget.tsx        # よく使うリンクショートカットウィジェット（async Server Component、新規）
│           └── FaqPickWidget.tsx           # FAQピックアップウィジェット（async Server Component、新規）
├── lib/
│   └── api/
│       ├── announcements.ts             # getRecentAnnouncements() モック関数（既存、変更なし）
│       ├── inquiries.ts                 # getInquiryStatusSummary()・getInquiries() モック関数（既存、変更なし）
│       ├── links.ts                     # getLinks() モック関数（既存、変更なし。`links-page` 仕様が定義）
│       └── faqs.ts                      # getFaqs() モック関数（既存、変更なし。`faq` 仕様が定義）
├── types/
│   ├── announcement.ts                  # Announcement 型定義（既存、変更なし）
│   ├── inquiry-summary.ts               # InquiryStatusSummary 型定義（既存、変更なし）
│   ├── inquiry.ts                       # Inquiry 型定義（既存、変更なし。`inquiry-form` 仕様が定義）
│   ├── link.ts                          # Link 型定義（既存、変更なし。`links-page` 仕様が定義）
│   └── faq.ts                           # Faq 型定義（既存、変更なし。`faq` 仕様が定義）
├── messages/
│   ├── ja.json                          # 日本語翻訳キー（本仕様で初期スキーマを確立）
│   └── en.json                          # 英語翻訳キー
├── i18n/
│   ├── routing.ts                       # next-intl ロケールリスト・デフォルトロケール設定
│   └── request.ts                       # next-intl サーバーサイドリクエスト設定
└── middleware.ts                        # next-intl ロケール検出・リダイレクト
```

### Modified Files

- `app/[locale]/page.tsx` — `RecentInquiriesWidget`・`QuickLinksWidget`・`FaqPickWidget` を追加配置し、レイアウトを縦方向に拡張する（`max-w-4xl` → `max-w-6xl`）
- `components/features/dashboard/AnnouncementWidget.tsx` — 表示件数を3件から5件に変更し、カテゴリバッジ（`Badge`）と詳細ページへの遷移リンクを追加する
- `messages/ja.json`, `messages/en.json` — `dashboard.recentInquiries`・`dashboard.quickLinks`・`dashboard.faqPick`・`dashboard.announcements.viewAll` 等のキーを追加する（既存キーは変更しない）

---

## System Flows

### 初回アクセス・言語切り替えフロー

```mermaid
sequenceDiagram
    participant User
    participant Middleware
    participant LocaleLayout
    participant AppShell
    participant DashboardPage
    participant MockAPI

    User->>Middleware: GET /
    Middleware->>User: 302 /ja（デフォルトロケール）
    User->>LocaleLayout: GET /ja
    LocaleLayout->>AppShell: レンダリング開始
    AppShell->>User: Header + Sidebar を描画
    AppShell->>DashboardPage: main領域にレンダリング
    DashboardPage->>MockAPI: getRecentAnnouncements
    DashboardPage->>MockAPI: getInquiryStatusSummary
    MockAPI->>DashboardPage: ダミーデータ返却
    DashboardPage->>User: ウィジェット描画完了

    User->>AppShell: 言語切り替え（EN選択）
    AppShell->>User: /en へルーティング（next-intl useRouter）
    User->>LocaleLayout: GET /en
    LocaleLayout->>User: 英語UIで全体再描画
```

フロー上のキー決定: ミドルウェアがデフォルトロケール（`ja`）へ302リダイレクトするため、`/` を直接ブックマークしたユーザーも正しくダッシュボードへ到達できる。

---

## Requirements Traceability

| 要件ID | 概要 | コンポーネント | インターフェース | フロー |
|--------|------|--------------|----------------|------|
| 1.1 | 全ページ共通3エリアレイアウト | AppShell | AppShellProps | 初回アクセスフロー |
| 1.2 | タブレット幅で横スクロールなし | AppShell, Sidebar | — | — |
| 1.3 | PC幅でサイドバー常時展開 | Sidebar | SidebarProps.isCollapsed | — |
| 1.4 | タブレット幅でサイドバーコンパクト | AppShell, Sidebar | SidebarProps.isCollapsed | — |
| 2.1 | ヘッダーにロゴ表示 | Header | — | — |
| 2.2 | ヘッダーに言語切り替えUI | Header, LanguageSwitcher | LanguageSwitcherProps | — |
| 2.3 | 言語切り替え時にUI全体再描画 | LanguageSwitcher | LanguageSwitcherProps | 初回アクセスフロー |
| 2.4 | テキストはnext-intl翻訳キー経由 | Header, LanguageSwitcher | messages/*.json | — |
| 3.1 | サイドバーに6ナビ項目表示 | Sidebar | NavItem[] | — |
| 3.2 | アクティブ項目のハイライト | Sidebar | NavItem | — |
| 3.3 | ナビ項目クリックで遷移 | Sidebar | NavItem.href | — |
| 3.4 | ナビラベルはnext-intl翻訳キー経由 | Sidebar | messages/*.json | — |
| 4.1 | ルートURLでダッシュボード表示 | app/[locale]/page.tsx | — | 初回アクセスフロー |
| 4.2 | お知らせ概要ウィジェット（最大3件） | AnnouncementWidget | AnnouncementsAPI | — |
| 4.3 | 問い合わせステータス概要ウィジェット | InquiryStatusWidget | InquiriesAPI | — |
| 4.4 | 新規問い合わせCTAリンク | app/[locale]/page.tsx | — | — |
| 4.5 | ローディング状態表示 | AnnouncementWidget, InquiryStatusWidget | — | — |
| 4.6 | エラー状態表示 | AnnouncementWidget, InquiryStatusWidget | — | — |
| 5.1 | ja/en 2言語サポート | 全コンポーネント | messages/ja.json, messages/en.json | — |
| 5.2 | 翻訳キー未存在時にenフォールバック | i18n/request.ts | — | — |
| 5.3 | JSXにテキストハードコードなし | 全コンポーネント | — | — |
| 5.4 | 言語ファイル追加で拡張可能 | i18n/routing.ts | — | — |
| 6.1 | データはlib/api/から取得 | AnnouncementWidget, InquiryStatusWidget | AnnouncementsAPI, InquiriesAPI | — |
| 6.2 | モック関数が実APIと同一インターフェース | lib/api/*.ts | AnnouncementsAPI, InquiriesAPI | — |
| 6.3 | コンポーネントはPromiseを前提に動作 | AnnouncementWidget, InquiryStatusWidget | — | — |
| 7.1 | 自社の問い合わせを送信日時降順で上位5件表示 | RecentInquiriesWidget | InquiriesAPI | — |
| 7.2 | 案件種別・緊急度・対応状況・送信日時を表示 | RecentInquiriesWidget | InquiriesAPI | — |
| 7.3 | 一覧項目クリックで詳細ページへ遷移 | RecentInquiriesWidget | next-intl Link | — |
| 7.4 | 0件時に空状態メッセージ | RecentInquiriesWidget | messages/*.json | — |
| 7.5 | 問い合わせ一覧ページへの遷移リンク | RecentInquiriesWidget | next-intl Link | — |
| 7.6 | 取得失敗時にエラーメッセージ | RecentInquiriesWidget | messages/*.json | — |
| 8.1 | お知らせ項目にカテゴリバッジ表示 | AnnouncementWidget | Badge | — |
| 8.2 | 表示件数を5件に増加 | AnnouncementWidget | AnnouncementsAPI | — |
| 8.3 | お知らせ項目クリックで詳細ページへ遷移 | AnnouncementWidget | next-intl Link | — |
| 8.4 | お知らせ一覧ページへの遷移リンク | AnnouncementWidget | next-intl Link | — |
| 8.5 | 0件時に空状態メッセージ（既存動作） | AnnouncementWidget | messages/*.json | — |
| 9.1 | よく使うリンクショートカットの表示 | QuickLinksWidget | LinksAPI | — |
| 9.2 | リンク集データから上位4〜6件表示 | QuickLinksWidget | LinksAPI | — |
| 9.3 | リンククリックで新しいタブで開く | QuickLinksWidget | — | — |
| 9.4 | リンク集ページへの遷移リンク | QuickLinksWidget | next-intl Link | — |
| 10.1 | FAQピックアップの表示 | FaqPickWidget | FaqsAPI | — |
| 10.2 | FAQデータから上位3〜5件表示 | FaqPickWidget | FaqsAPI | — |
| 10.3 | FAQ項目クリックでFAQページへ遷移 | FaqPickWidget | next-intl Link | — |
| 10.4 | FAQページ全体への遷移リンク | FaqPickWidget | next-intl Link | — |
| 11.1 | ウィジェット追加後もレスポンシブ挙動を維持 | app/[locale]/page.tsx | — | — |
| 11.2 | Suspense・Skeletonパターンで非同期ロード | RecentInquiriesWidget, QuickLinksWidget, FaqPickWidget | — | — |
| 11.3 | 表示テキストはnext-intl翻訳キー経由 | 全ダッシュボードウィジェット | messages/*.json | — |
| 11.4 | 既存共通UIコンポーネント・ブランドトークンを使用 | 全ダッシュボードウィジェット | Card, Badge | — |
| 11.5 | 既存機能のデータ・API・翻訳キーを変更しない | RecentInquiriesWidget, QuickLinksWidget, FaqPickWidget | InquiriesAPI, LinksAPI, FaqsAPI | — |

---

## Components and Interfaces

### コンポーネント概要

| コンポーネント | ドメイン/レイヤー | 役割 | 要件カバレッジ | 主要依存 (P0/P1) | コントラクト |
|---|---|---|---|---|---|
| AppShell | Layout | 3エリアレイアウトシェル | 1.1, 1.2, 1.3, 1.4 | Header(P0), Sidebar(P0) | State |
| Header | Layout | ロゴ + 言語切り替え | 2.1, 2.2, 2.3, 2.4 | LanguageSwitcher(P0) | Service |
| Sidebar | Layout | ナビゲーションリスト | 3.1, 3.2, 3.3, 3.4 | next-intl Link(P0) | Service |
| LanguageSwitcher | Layout | 言語トグルUI | 2.2, 2.3, 5.1, 5.4 | next-intl useRouter(P0) | Service |
| app/[locale]/page.tsx | Routing | ダッシュボードページ配置 | 4.1, 4.4 | AnnouncementWidget(P0), InquiryStatusWidget(P0) | — |
| AnnouncementWidget | Feature/Dashboard | お知らせ概要表示（5件・カテゴリバッジ・詳細/一覧リンク） | 4.2, 4.5, 4.6, 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 8.4, 8.5 | AnnouncementsAPI(P0), Skeleton(P1), Badge(P1) | Service |
| InquiryStatusWidget | Feature/Dashboard | ステータス集計カード | 4.3, 4.5, 4.6, 6.1, 6.2, 6.3 | InquiriesAPI(P0), Skeleton(P1) | Service |
| RecentInquiriesWidget | Feature/Dashboard | 自社の直近の問い合わせ一覧表示（上位5件） | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.2, 11.3, 11.4 | InquiriesAPI(P0), Skeleton(P1), Badge(P1) | Service |
| QuickLinksWidget | Feature/Dashboard | よく使うリンクショートカット表示（上位4〜6件） | 9.1, 9.2, 9.3, 9.4, 11.2, 11.3, 11.4 | LinksAPI(P0), Skeleton(P1) | Service |
| FaqPickWidget | Feature/Dashboard | FAQピックアップ表示（上位3〜5件） | 10.1, 10.2, 10.3, 10.4, 11.2, 11.3, 11.4 | FaqsAPI(P0), Skeleton(P1) | Service |
| AnnouncementsAPI | Mock API | お知らせモックデータ提供 | 6.1, 6.2, 6.3 | — | Service |
| InquiriesAPI | Mock API | 問い合わせ集計・一覧モックデータ提供（`getInquiryStatusSummary`・`getInquiries`） | 6.1, 6.2, 6.3, 7.1 | — | Service |
| LinksAPI | Mock API | リンク集モックデータ提供（`getLinks`。`links-page` 仕様が定義） | 9.2 | — | Service |
| FaqsAPI | Mock API | FAQモックデータ提供（`getFaqs`。`faq` 仕様が定義） | 10.2 | — | Service |

---

### Layout Layer

#### AppShell

| Field | Detail |
|---|---|
| Intent | ヘッダー・サイドバー・メインコンテンツの3エリアレイアウトをすべてのページに提供する |
| Requirements | 1.1, 1.2, 1.3, 1.4 |

**Responsibilities & Constraints**
- Tailwind CSS の flex レイアウトで Header（上部固定）・Sidebar（左固定）・`main`（残余領域）を構成する
- サイドバー開閉状態 `isSidebarCollapsed` を `useState` で保持し、`isCollapsed` として Sidebar へ props 渡しする
- `children` prop にページコンポーネントをレンダリングする

**Dependencies**
- Outbound: Header — ヘッダー表示（P0）
- Outbound: Sidebar — ナビゲーション表示（P0）（`isCollapsed` を渡す）

**Contracts**: Service [x] / State [x]

##### Service Interface

```typescript
interface AppShellProps {
  children: React.ReactNode;
}
```

##### State Management

- `isSidebarCollapsed: boolean` — AppShell ローカル `useState`
- PC幅（≥1280px）: Tailwind `lg:` ブレークポイントで Sidebar を展開幅（例: `w-60`）で表示
- タブレット幅（768px–1279px）: Tailwind `md:` ブレークポイントで Sidebar をアイコン幅（例: `w-16`）に縮小
- 横スクロール防止: ルート要素に `overflow-x-hidden` + `min-w-0` を適用する

**Implementation Notes**
- Integration: `app/[locale]/layout.tsx` で `<AppShell>{children}</AppShell>` としてインポートする
- Validation: Chrome DevTools で 768px 幅に設定し、横スクロールバーが発生しないことを確認する

---

#### Header

| Field | Detail |
|---|---|
| Intent | ポータルロゴと言語切り替えUIを上部固定領域に常時表示する |
| Requirements | 2.1, 2.2, 2.3, 2.4 |

**Dependencies**
- Outbound: LanguageSwitcher — 言語切り替えUI（P0）
- External: next-intl `useTranslations` — ヘッダーラベルの翻訳（P0）

**Contracts**: Service [x]

##### Service Interface

```typescript
interface HeaderProps {
  // フェーズ1はpropsなし（ユーザー情報表示はフェーズ2以降）
}
```

**Implementation Notes**
- Integration: AppShell 内の `header` 要素としてレンダリングする。Tailwind `h-14 fixed top-0` 等でヘッダー高さを確保する
- Validation: `t('header.title')` 等の翻訳キーが `ja.json` / `en.json` に存在することを確認する

---

#### Sidebar

| Field | Detail |
|---|---|
| Intent | 全機能ページへのナビゲーションを提供し、現在ページをアクティブ状態として強調表示する |
| Requirements | 3.1, 3.2, 3.3, 3.4, 1.3, 1.4 |

**Responsibilities & Constraints**
- ナビゲーション項目リスト（`NAV_ITEMS`）を定数として定義し、翻訳キー・アイコン・パスのペアで管理する
- `usePathname`（next-intl）でアクティブ判定を行う。ロケールプレフィックス（`/ja`, `/en`）を除去して比較する
- `isCollapsed` が `true` のときはアイコンのみ表示、`false` のときはアイコン + ラベルを表示する

**Dependencies**
- Inbound: AppShell — `isCollapsed` prop 受け取り（P0）
- External: next-intl `Link`, `useTranslations`, `usePathname` — ルーティングと翻訳（P0）

**Contracts**: Service [x]

##### Service Interface

```typescript
interface NavItem {
  translationKey: string;              // 例: 'nav.dashboard'
  href: string;                        // 例: '/'（ロケールプレフィックスなし）
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  isCollapsed: boolean;
}
```

ナビゲーション項目（6件）:

| translationKey | href |
|---|---|
| `nav.dashboard` | `/` |
| `nav.inquiryForm` | `/inquiry/new` |
| `nav.inquiryList` | `/inquiry` |
| `nav.announcements` | `/announcements` |
| `nav.links` | `/links` |
| `nav.faq` | `/faq` |

**Implementation Notes**
- Integration: `NAV_ITEMS` 配列を `map()` でレンダリングする。各項目は next-intl `Link` でラップする
- Risks: `usePathname()` はロケールプレフィックスを含む（例: `/ja/faq`）。`/ja` 部分をトリミングしてから `href` と比較する必要がある

---

#### LanguageSwitcher

| Field | Detail |
|---|---|
| Intent | 日本語・英語の切り替えUIを提供し、選択時に next-intl のロケールを切り替える |
| Requirements | 2.2, 2.3, 5.1, 5.4 |

**Dependencies**
- External: next-intl `useRouter`, `useLocale`, `usePathname` — ロケール切り替え（P0）

**Contracts**: Service [x]

##### Service Interface

```typescript
type SupportedLocale = 'ja' | 'en';

interface LanguageSwitcherProps {
  // ロケールはnext-intlフックから取得するためpropsなし
}
```

**Implementation Notes**
- Integration: `useRouter().replace(pathname, { locale: nextLocale })` で現在のパスを保持しつつロケールを切り替える
- Risks: `SupportedLocale` 型を `i18n/routing.ts` の `locales` 設定と同期させること。将来の言語追加時に両方の更新が必要

---

### Feature Layer

#### AnnouncementWidget

| Field | Detail |
|---|---|
| Intent | 最新のお知らせを5件取得し、カテゴリバッジ・タイトル・日付でリスト表示する。項目クリックで詳細ページへ、ウィジェット下部のリンクでお知らせ一覧ページへ遷移できる。ローディング・エラー状態を処理する |
| Requirements | 4.2, 4.5, 4.6, 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 8.4, 8.5 |

**Dependencies**
- Outbound: `lib/api/announcements.ts` `getRecentAnnouncements({ limit: 5 })` — データ取得（P0）
- External: next-intl `useTranslations`, `Link` — セクションタイトル・エラーメッセージ翻訳・遷移リンク（P0）
- External: shadcn/ui `Card`, `Skeleton`, `Badge` — UIコンポーネント（P1）

**Contracts**: Service [x]

##### Service Interface

```typescript
// AnnouncementWidget は async Server Component のため props なし
// データはコンポーネント内で直接 await する
```

**Implementation Notes**
- Integration: `async` Server Component として実装する。呼び出し元（`page.tsx`）は `<Suspense fallback={<AnnouncementWidgetSkeleton />}>` で囲む。各項目は `Link href={`/announcements/${item.id}`}` でラップし、`Badge variant={item.category}` でカテゴリを表示する（既存の `announcements.categories` 翻訳キーを再利用）
- Validation: ローディング中はshadcn/ui `Skeleton` を fallback として表示する。エラー時は `try-catch` でキャッチし翻訳キー経由のエラーメッセージを表示する
- Risks: フェーズ3での実API移行時、`getRecentAnnouncements` の関数シグネチャが変わらない限りこのコンポーネントへの変更は不要

---

#### InquiryStatusWidget

| Field | Detail |
|---|---|
| Intent | 問い合わせの新規・対応中・解決済みの件数を3枚のカードで表示する |
| Requirements | 4.3, 4.5, 4.6, 6.1, 6.2, 6.3 |

**Dependencies**
- Outbound: `lib/api/inquiries.ts` `getInquiryStatusSummary` — データ取得（P0）
- External: next-intl `useTranslations` — ステータスラベル・件数単位の翻訳（P0）
- External: shadcn/ui `Card`, `Skeleton` — UIコンポーネント（P1）

**Contracts**: Service [x]

##### Service Interface

```typescript
// InquiryStatusWidget は async Server Component のため props なし
```

**Implementation Notes**
- Integration: AnnouncementWidget と同様に async Server Component + Suspense パターンを使用する
- Validation: 3枚のカード（新規・対応中・解決済み）のラベルをそれぞれ翻訳キー経由で表示する

---

#### RecentInquiriesWidget（新規）

| Field | Detail |
|---|---|
| Intent | 自社の問い合わせを送信日時降順で上位5件取得し、案件種別・緊急度・対応状況・送信日時を一覧表示する。項目クリックで詳細ページへ、ウィジェット下部のリンクで問い合わせ一覧ページへ遷移できる |
| Requirements | 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.2, 11.3, 11.4 |

**Dependencies**
- Outbound: `lib/api/inquiries.ts` `getInquiries` — データ取得（P0）。取得結果は送信日時降順で返るため、先頭5件を `slice(0, 5)` で取得する
- External: next-intl `useTranslations`, `Link` — ラベル翻訳・遷移リンク（P0）
- External: shadcn/ui `Card`, `Skeleton`, `Badge` — UIコンポーネント（P1）

**Contracts**: Service [x]

##### Service Interface

```typescript
// RecentInquiriesWidget は async Server Component のため props なし
```

**Implementation Notes**
- Integration: `getInquiries()` の戻り値の先頭5件を表示する。各項目は `Link href={`/inquiry/${item.id}`}` でラップする。案件種別・緊急度は既存の `inquiryForm.options.category.*` / `inquiryForm.options.urgency.*`、対応状況は `inquiryList.status.*` の翻訳キーを再利用する。緊急度・対応状況は既存の `Badge` バリアント（`urgency-*`・`status-*`）をそのまま使う
- Validation: 0件時は空状態メッセージ、取得失敗時はエラーメッセージを翻訳キー経由で表示する。ウィジェット下部に `/inquiry` への遷移リンクを表示する
- Risks: `getInquiries()` は全件取得のため、将来件数が増えた場合でも本ウィジェット側で必ず上位5件に絞る（APIの追加パラメータには依存しない）

---

#### QuickLinksWidget（新規）

| Field | Detail |
|---|---|
| Intent | リンク集データから上位4〜6件を取得し、ショートカットとして表示する。クリックで新しいタブでリンク先を開く |
| Requirements | 9.1, 9.2, 9.3, 9.4, 11.2, 11.3, 11.4 |

**Dependencies**
- Outbound: `lib/api/links.ts` `getLinks` — データ取得（P0）。取得結果の先頭4〜6件を表示する
- External: next-intl `useTranslations`, `Link` — セクションタイトル・遷移リンク（P0）
- External: shadcn/ui `Card`, `Skeleton` — UIコンポーネント（P1）

**Contracts**: Service [x]

##### Service Interface

```typescript
// QuickLinksWidget は async Server Component のため props なし
```

**Implementation Notes**
- Integration: `getLinks()` の戻り値の先頭4〜6件を `<a href={item.url} target="_blank" rel="noopener noreferrer">` で表示する（`links-page` 仕様のリンク項目コンポーネントと同じ新規タブ挙動）。ウィジェット下部に `/links` への遷移リンクを表示する
- Validation: リンクのタイトル・カテゴリラベルは既存の `links.categories` 翻訳キーを再利用する
- Risks: `getLinks()` にはカテゴリ別の絞り込みパラメータが無いため、取得した全件の先頭N件を表示する（特定カテゴリを優先させる要件が出た場合は本ウィジェット側でフィルタする）

---

#### FaqPickWidget（新規）

| Field | Detail |
|---|---|
| Intent | FAQデータから上位3〜5件の質問を取得し、ピックアップ表示する。クリックでFAQページへ遷移する |
| Requirements | 10.1, 10.2, 10.3, 10.4, 11.2, 11.3, 11.4 |

**Dependencies**
- Outbound: `lib/api/faqs.ts` `getFaqs` — データ取得（P0）。取得結果の先頭3〜5件を表示する
- External: next-intl `useTranslations`, `Link` — セクションタイトル・遷移リンク（P0）
- External: shadcn/ui `Card`, `Skeleton` — UIコンポーネント（P1）

**Contracts**: Service [x]

##### Service Interface

```typescript
// FaqPickWidget は async Server Component のため props なし
```

**Implementation Notes**
- Integration: `getFaqs()` の戻り値の先頭3〜5件の質問文を表示する。各項目・ウィジェット下部のリンクはいずれも `/faq` へ遷移する（フェーズ1ではFAQページ内の特定質問への直接ディープリンクは対象外とする）
- Validation: 質問文が長い場合は既存の `line-clamp` パターン（`AnnouncementWidget` と同様）で省略表示する
- Risks: なし（読み取り専用の表示）

---

### Mock API Layer

#### AnnouncementsAPI と InquiriesAPI

**Contracts**: Service [x]

##### Service Interface

```typescript
// types/announcement.ts
export interface Announcement {
  id: string;
  title: string;
  publishedAt: string; // ISO 8601 形式（例: "2026-07-01T09:00:00Z"）
}

// lib/api/announcements.ts
export interface GetRecentAnnouncementsOptions {
  limit?: number; // デフォルト: 3
}

export function getRecentAnnouncements(
  options?: GetRecentAnnouncementsOptions
): Promise<Announcement[]>;
```

```typescript
// types/inquiry-summary.ts
export interface InquiryStatusSummary {
  new: number;
  in_progress: number;
  resolved: number;
}

// lib/api/inquiries.ts
export function getInquiryStatusSummary(): Promise<InquiryStatusSummary>;
```

**Implementation Notes**
- Integration: フェーズ1では静的ダミーデータを `Promise.resolve(data)` で返す。フェーズ3では関数本体のみ実APIコールに差し替える（シグネチャは変更しない）
- Validation: 呼び出し元コンポーネントは必ず `await` でデータを受け取ること（要件 6.3）

---

## Data Models

### Domain Model

```
Announcement（読み取り専用・ダッシュボード概要表示用）
  id:          string   — 一意識別子
  title:       string   — お知らせタイトル（翻訳済み文字列を想定）
  publishedAt: string   — 公開日時（ISO 8601）

InquiryStatusSummary（集計値・ダッシュボード表示用）
  new:         number   — 新規問い合わせ件数
  in_progress: number   — 対応中件数
  resolved:    number   — 解決済み件数
```

詳細な `Inquiry` 型（`category`・`urgency`・`originalText` 等）は `inquiry-form` 仕様が定義する。`Link` 型は `links-page` 仕様、`Faq` 型は `faq` 仕様が定義する。本仕様（ダッシュボード）はこれらの型を変更せず、表示のために読み取り専用で参照するのみである。問い合わせステータス概要ウィジェットは集計結果（`InquiryStatusSummary`）のみを使用し、新設の `RecentInquiriesWidget` は `Inquiry[]` を（絞り込みなしで）先頭5件表示のために参照する。

### Data Contracts & Integration

| 関数 | 引数 | 戻り値型 | 定義元仕様 | フェーズ3での差し替え先 |
|---|---|---|---|---|
| `getRecentAnnouncements` | `{ limit?: number }` | `Promise<Announcement[]>` | dashboard（本仕様） | お知らせ一覧APIエンドポイント |
| `getInquiryStatusSummary` | なし | `Promise<InquiryStatusSummary>` | dashboard（本仕様） | 問い合わせ集計APIエンドポイント |
| `getInquiries` | なし | `Promise<Inquiry[]>`（送信日時降順） | inquiry-form / inquiry-list | 問い合わせ一覧APIエンドポイント |
| `getLinks` | なし | `Promise<Link[]>` | links-page | リンク集APIエンドポイント |
| `getFaqs` | なし | `Promise<Faq[]>` | faq | FAQ一覧APIエンドポイント |

---

## Error Handling

### Error Strategy

フェーズ1はモックAPIを使用するためデータ取得エラーは基本的に発生しない。ただし Server Component 内に `try-catch` を設けることでフェーズ3の実API連携時に備える。

### Error Categories and Responses

- **データ取得失敗**: `try-catch` でキャッチし、翻訳キー経由のエラーメッセージを該当ウィジェット領域に表示する（他のウィジェットへの影響なし）
- **翻訳キー未存在**: next-intl が自動的に `en` にフォールバックする（要件 5.2）。コンソール警告を出力するため、開発時に検出可能

---

## Testing Strategy

### Unit Tests

- `Sidebar`: `usePathname()` の返り値に応じてアクティブ項目が正しくハイライトされること（ロケールプレフィックスのトリミング込み）
- `LanguageSwitcher`: ロケール切り替え時に `useRouter().replace()` が正しい引数（locale・pathname）で呼ばれること
- `getRecentAnnouncements`: `limit` オプションが返り値の件数に反映されること・返り値が `Announcement[]` 型であること
- `getInquiryStatusSummary`: 返り値が `InquiryStatusSummary` 型であること（`new` / `in_progress` / `resolved` フィールドを持つ）
- `RecentInquiriesWidget`: `getInquiries()` の戻り値のうち先頭5件のみを表示すること、0件時に空状態メッセージを表示すること
- `QuickLinksWidget`: `getLinks()` の戻り値の先頭4〜6件を表示すること、リンクが新しいタブで開く属性（`target="_blank"`・`rel="noopener noreferrer"`）を持つこと
- `FaqPickWidget`: `getFaqs()` の戻り値の先頭3〜5件を表示すること

### Integration Tests

- `AnnouncementWidget`: モックAPI → ウィジェット表示の結合（5件表示・カテゴリバッジ・日付フォーマット・詳細/一覧リンク）
- `InquiryStatusWidget`: モックAPI → 3枚カード表示の結合
- `RecentInquiriesWidget`: モックAPI → 一覧表示の結合（案件種別・緊急度・対応状況バッジ・詳細/一覧リンク）
- `QuickLinksWidget` / `FaqPickWidget`: モックAPI → ウィジェット表示の結合

### E2E/UI Tests

- ルートURL（`/`）アクセス時に `/ja` へリダイレクトされダッシュボードが表示されること
- 言語切り替えUI操作後にURLが `/en` に変わり、UI全テキストが英語に切り替わること
- サイドバーのナビゲーション項目をクリックして対応ページへ遷移できること
- 768px 幅でレイアウトが崩れず横スクロールバーが発生しないこと
- （追記）ダッシュボードの問い合わせ一覧項目・お知らせ項目をクリックすると各詳細ページへ遷移すること
- （追記）よく使うリンクをクリックすると新しいタブでリンク先が開くこと
- （追記）各ウィジェットの「一覧を見る」リンクから対応する一覧ページへ遷移できること

---

## 翻訳キースキーマ（初期定義）

本仕様が確立する `messages/` の初期キー構造。後続仕様は既存キーを拡張するかたちで追記する。

```json
// messages/ja.json（抜粋）
{
  "header": {
    "title": "ヘルプデスクポータル"
  },
  "nav": {
    "dashboard": "ダッシュボード",
    "inquiryForm": "問い合わせ申請",
    "inquiryList": "問い合わせ一覧",
    "announcements": "お知らせ",
    "links": "リンク集",
    "faq": "FAQ"
  },
  "dashboard": {
    "announcements": {
      "title": "お知らせ",
      "empty": "お知らせはありません",
      "error": "お知らせの取得に失敗しました",
      "viewAll": "お知らせ一覧を見る"
    },
    "inquiryStatus": {
      "title": "問い合わせ状況",
      "new": "新規",
      "inProgress": "対応中",
      "resolved": "解決済み",
      "error": "データの取得に失敗しました"
    },
    "recentInquiries": {
      "title": "自社の問い合わせ",
      "empty": "問い合わせはありません",
      "error": "問い合わせの取得に失敗しました",
      "viewAll": "問い合わせ一覧を見る"
    },
    "quickLinks": {
      "title": "よく使うリンク",
      "empty": "リンクはありません",
      "error": "リンクの取得に失敗しました",
      "viewAll": "リンク集を見る"
    },
    "faqPick": {
      "title": "よくある質問",
      "empty": "FAQはありません",
      "error": "FAQの取得に失敗しました",
      "viewAll": "FAQをもっと見る"
    },
    "cta": "新規問い合わせを申請する"
  }
}
```

（追記）ダッシュボードの問い合わせ一覧・お知らせのカテゴリ/緊急度/対応状況ラベルは、それぞれ既存の `inquiryForm.options.category.*`・`inquiryForm.options.urgency.*`・`inquiryList.status.*`・`announcements.categories.*` を再利用し、重複するキーを新設しない。
