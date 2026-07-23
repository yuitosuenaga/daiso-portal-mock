# 技術設計書: faq

## Overview

**Purpose**: 本機能は、海外販社担当者がヘルプデスクへ問い合わせる前に、よくある質問と回答をカテゴリ別に整理された一覧ページ（`/faq`）でセルフサービス的に確認できるようにする。

**Users**: 海外販社の担当者が、サイドバーの「FAQ」ナビゲーションから遷移し、質問をクリック（アコーディオン展開）して回答を確認する際に利用する。

**Impact**: 既存の`/faq`は`PlaceholderPage`を表示しているのみであり、本設計はそれを実際のFAQ一覧表示に置き換える。`Faq`型・関連モックAPI・アコーディオンUIプリミティブは本仕様が新規に定義する。既存の`Announcement`/`Link`/`Inquiry`関連の型・コンポーネントは変更しない。

### Goals
- よくある質問をカテゴリ別にグループ化して一覧表示する
- 質問をクリック（またはキーボード操作）すると回答が展開/折りたたみされ、複数の質問を独立して同時展開できる
- アコーディオンの開閉状態がスクリーンリーダー利用者にも識別できる（`aria-expanded`等）
- 日本語・英語の両言語でFAQ一覧が利用できる

### Non-Goals
- ヘルプデスク担当者向けのFAQ新規作成・編集・削除機能
- FAQの検索・キーワードフィルタ機能
- 質問ごとの詳細画面（動的ルート）
- ユーザーからの「役に立った」等のフィードバック収集機能

## Boundary Commitments

### This Spec Owns
- FAQ一覧ページ（`/faq`）のUI
- `Faq`型・カテゴリ定数（`src/types/faq.ts`・`src/lib/constants/faq-options.ts`）
- 静的モックデータと、それを返すモック関数（`lib/api/faqs.ts`の`getFaqs`）
- FAQ関連の翻訳キー（`messages/ja.json` / `en.json` の `faq` 名前空間）
- 新規のアコーディオンUIプリミティブ（`components/ui/accordion.tsx`）

### Out of Boundary
- `Announcement`/`Link`/`Inquiry`型・関連モックAPI・関連コンポーネント（本仕様はこれらを一切変更しない）
- グローバルレイアウト（Header/Sidebar/AppShell/LanguageSwitcher）の変更
- ヘルプデスク側からのFAQ編集・承認ワークフロー（将来フェーズ）

### Allowed Dependencies
- `dashboard` 仕様が提供する `AppShell` / ロケールレイアウト
- 既存のUI基盤コンポーネント（`card.tsx`・`skeleton.tsx`）
- 既存の `next-intl` 設定
- 新規外部依存: `@radix-ui/react-accordion`（既存の`@radix-ui/react-slot`と同系列。ライセンス・React 18ピア互換性を確認済み）

### Revalidation Triggers
- `components/ui/accordion.tsx`を他機能が再利用し始めた場合、本仕様が定義したContractの後方互換性を維持する必要がある
- `@radix-ui/react-accordion`のメジャーバージョンアップ時はAPI変更の有無を確認する

## Architecture

### Existing Architecture Analysis
- `AnnouncementList`/`LinkList`/`InquiryList`（既存仕様）が確立した「async Server Component + `try/catch` + `Suspense`/Skeleton」パターンをデータ取得・状態表示部分で踏襲する
- `LinkList`のカテゴリ別グループ化ループ（`LINK_CATEGORY_CODES`をmapし、該当カテゴリのデータのみをフィルタして`Card`単位で表示）と同様の構造を、FAQ専用の型・定数で再実装する
- 既存のリスト系コンポーネントはすべて非対話的な読み取り専用表示だが、本機能はアコーディオン開閉という初めてのクライアント側インタラクションを持つ。このため、データ取得（Server Component）と開閉インタラクション（Client Component）を明確に分離する

### Architecture Pattern & Boundary Map

```mermaid
graph TB
    FaqPage[FaqPage]
    List[FaqList]
    Group[FaqCategoryGroup]
    Accordion[FaqAccordion]
    AccordionUi[AccordionUiPrimitive]
    Api[FaqsApi]
    Types[FaqType]

    FaqPage --> List
    List --> Group
    Group --> Accordion
    Accordion --> AccordionUi
    List --> Api
    Api --> Types
```

**Architecture Integration**:
- **Selected pattern**: データ取得・カテゴリ分類は既存の「async Server Component + `try/catch` + Suspense/Skeleton」パターンを踏襲し、質問1件ごとの開閉インタラクションのみをClient Componentに切り出す「Server/Clientコンポーネント分離」パターンを採用する
- **Domain/feature boundaries**: `lib/api/faqs.ts`（新規） → `components/features/faq/*`（UI） → `app/[locale]/faq/page.tsx`（ルーティング）という一方向の依存関係。カテゴリごとの分類ロジックはServer Component側（`FaqList`）に置き、Client Component（`FaqAccordion`）はpropsで受け取った質問配列の開閉状態のみを管理する
- **Existing patterns preserved**: `AppShell`によるレイアウト共有、`lib/api/`のモック関数規約、`next-intl`翻訳キー規約、`Suspense`+Skeletonによるローディング表示パターン、`lib/constants/*-options.ts`によるカテゴリコード定義規約
- **New components rationale**: `components/ui/accordion.tsx`は`@radix-ui/react-accordion`をラップする新規UIプリミティブで、アクセシビリティ要件（3.4, 3.5）を標準機能で満たすために導入する。`FaqAccordion`は開閉stateを持つ唯一のClient Componentとして責務を分離する
- **Steering compliance**: `structure.md`が想定する`components/features/faq/`構成、`lib/api/`でのモック抽象化、翻訳キー経由の文字列管理、`tech.md`の「状態管理はReact標準機能のみ」（Radixの内部状態はReact標準の`useState`/Contextで実装されており、追加の状態管理ライブラリではない）をすべて満たす

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|------------------|-------|
| Frontend | Next.js 14.2 (App Router) + React 18 + TypeScript 5 | 既存スタックを継続利用 | 変更なし |
| UIコンポーネント | `@radix-ui/react-accordion` 1.2.x（新規） + 既存の`card`/`skeleton` | アコーディオン開閉の基盤ロジック・アクセシビリティ属性 | React 18ピア互換性確認済み（`^16.8 \|\| ^17.0 \|\| ^18.0 \|\| ^19.0`）。既存の`@radix-ui/react-slot`と同系列のライブラリで技術選定の一貫性がある |
| 多言語対応 | next-intl（既存） | 一覧文字列の翻訳 | 新規の`faq`名前空間を追加 |
| データ取得 | モック関数（`lib/api/faqs.ts`、新規） | `getFaqs`を新規追加 | 既存の他機能のAPIファイルとは独立したファイル |

## File Structure Plan

### Directory Structure
```
src/
├── types/
│   └── faq.ts                              # 新規: Faq型・FaqCategory型
├── lib/
│   ├── constants/
│   │   └── faq-options.ts                  # 新規: FAQ_CATEGORY_CODES定数
│   └── api/
│       └── faqs.ts                         # 新規: 静的モックデータ + getFaqs
├── components/
│   ├── ui/
│   │   └── accordion.tsx                   # 新規: Radixラッパー（Accordion/AccordionItem/AccordionTrigger/AccordionContent）
│   └── features/
│       └── faq/
│           ├── FaqList.tsx                 # 一覧取得・状態管理 + FaqListSkeleton（Server Component）
│           ├── FaqCategoryGroup.tsx        # カテゴリ見出し + 質問配列の受け渡し（Server Component）
│           └── FaqAccordion.tsx            # 開閉インタラクション（Client Component、"use client"）
└── app/[locale]/faq/
    └── page.tsx                            # PlaceholderPage呼び出しをFaqList呼び出しに変更
messages/ja.json, messages/en.json          # faq 名前空間（一覧見出し・空/エラーメッセージ・カテゴリ表示名）を新規追加
```

### Modified Files
- `src/app/[locale]/faq/page.tsx` — `PlaceholderPage`の呼び出しを、`Suspense`+`FaqListSkeleton`でラップした`FaqList`の呼び出しに置き換える
- `package.json` — `@radix-ui/react-accordion`を依存に追加
- `messages/ja.json` / `messages/en.json` — `faq`名前空間（一覧見出し・空/エラーメッセージ・カテゴリ表示名）を新規追加

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1–1.3 | 一覧ページへのアクセス・全体構造 | FaqPage, FaqList | - | - |
| 2.1–2.4 | カテゴリ別分類 | FaqList, FaqCategoryGroup | GetFaqs Service Interface | - |
| 3.1–3.5 | アコーディオン表示 | FaqCategoryGroup, FaqAccordion | AccordionUi State Interface | アコーディオン開閉フロー |
| 4.1–4.3 | 状態表示 | FaqList | GetFaqs Service Interface | - |
| 5.1–5.2 | モックAPI連携 | FaqList | GetFaqs Service Interface | - |
| 6.1–6.3 | 多言語対応 | 全コンポーネント | messages/faq | - |
| 7.1–7.2 | レスポンシブ | FaqList, FaqCategoryGroup, FaqAccordion | - | - |

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|---------------|---------------------------|-----------|
| FaqList | Feature | 全件取得・ローディング/エラー/空状態の管理・カテゴリ別グループ化 | 1, 2, 4, 5 | GetFaqs (P0), FaqCategoryGroup (P1) | Service, State |
| FaqCategoryGroup | Feature (UI) | カテゴリ見出し表示、質問配列を`FaqAccordion`へ橋渡し | 2.2, 2.3 | FaqAccordion (P1) | - |
| FaqAccordion | Feature (UI, Client) | 質問クリック/キー操作による回答の開閉、開閉状態の独立管理 | 3.1, 3.2, 3.3, 3.4, 3.5 | AccordionUiPrimitive (P0) | State |
| AccordionUiPrimitive (`components/ui/accordion.tsx`) | UI Primitive | `@radix-ui/react-accordion`のラップ、`aria-expanded`等の付与 | 3.4, 3.5 | @radix-ui/react-accordion (P0) | State |

### Feature Layer

#### FaqList

| Field | Detail |
|-------|--------|
| Intent | FAQ全件を取得し、カテゴリごとにグループ化して表示する。ローディング・エラー・空状態を管理する |
| Requirements | 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3, 5.1 |

**Responsibilities & Constraints**
- async Server Componentとして実装し、`getFaqs()`を`try/catch`で呼び出す（`LinkList`と同じエラーハンドリング規約）
- 取得結果を`FAQ_CATEGORY_CODES`の順にフィルタし、該当データが1件もないカテゴリはグループ自体を表示しない（`LinkList`と同じ規約）
- 取得結果が空配列の場合、専用の空状態メッセージを表示する

**Dependencies**
- Outbound: `getFaqs`（モックAPI） — 一覧データ取得 (P0)
- Outbound: `FaqCategoryGroup` — カテゴリ単位の表示 (P1)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### Service Interface
```typescript
function getFaqs(): Promise<Faq[]>;
```
- Preconditions: なし
- Postconditions: 全件の`Faq`配列を解決する（並び順の保証はなく、カテゴリ別グループ化は呼び出し側の責務とする。`getLinks`と同一の規約）
- Invariants: 他機能（`Announcement`/`Link`/`Inquiry`）のデータとは独立している

##### State Management
- State model: サーバーコンポーネントのため、クライアント側の状態は持たない
- Persistence & consistency: フェーズ1ではクライアントに状態を保持しない

**Implementation Notes**
- Integration: `lib/api/faqs.ts`は本仕様が新規に作成するファイルであり、既存のAPIファイルとの衝突はない
- Validation: 該当なし（読み取り専用の一覧表示）
- Risks: なし

#### FaqCategoryGroup

新しい境界（ロジック・外部結合）を持たないプレゼンテーション層のコンポーネントであり、サマリー行の記載で十分とする。

**Implementation Notes**
- Integration: `FaqList`からカテゴリコード・カテゴリ表示ラベル・当該カテゴリに属する`Faq[]`をpropsで受け取り、`Card`内にカテゴリ見出しと`FaqAccordion`を配置する
- Validation: 該当なし
- Risks: なし

#### FaqAccordion

| Field | Detail |
|-------|--------|
| Intent | 質問ごとの回答表示/非表示をクリック・キーボード操作で切り替え、各質問の開閉状態を独立して管理する |
| Requirements | 3.1, 3.2, 3.3, 3.4, 3.5 |

**Responsibilities & Constraints**
- `"use client"`境界を持つ唯一のコンポーネントとし、`components/ui/accordion.tsx`（`AccordionUiPrimitive`）の`type="multiple"`モードを用いて、複数の質問を独立して同時展開できるようにする（要件3.3）
- 初期状態はすべての質問を折りたたんだ状態とする（要件3.1）。Radixの`defaultValue`を空配列として渡すことで表現する
- キーボード操作（Enter/Space/矢印キー）・`aria-expanded`はRadixプリミティブが標準で提供するため、本コンポーネントはそれを呼び出すのみで要件3.4/3.5を満たす

**Dependencies**
- Outbound: `AccordionUiPrimitive`（`components/ui/accordion.tsx`） — 開閉ロジック・アクセシビリティ属性の提供 (P0)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management
- State model: Radixの`Accordion.Root`が内部で保持する「展開中の質問idの配列」をクライアント側stateとして利用する（`type="multiple"`、非制御モード）
- Persistence & consistency: ページ再読み込みで開閉状態はリセットされる（永続化はフェーズ1の要件外）
- Concurrency strategy: 単一ユーザーのブラウザ内状態のみであり、並行性の考慮は不要

**Implementation Notes**
- Integration: `FaqCategoryGroup`から質問配列（`{id, question, answer}`相当）をpropsで受け取り、`AccordionUiPrimitive`の`Item`/`Trigger`/`Content`にマッピングする
- Validation: 該当なし
- Risks: Radixの`Content`はアンマウントせず`hidden`属性で非表示にする実装のため、質問数が極端に多い場合はDOMサイズが増える。フェーズ1のFAQ件数（8〜12件程度）では実害はない

#### AccordionUiPrimitive（`components/ui/accordion.tsx`）

| Field | Detail |
|-------|--------|
| Intent | `@radix-ui/react-accordion`をラップし、`Badge`/`Card`と同様のTailwindスタイルを適用した汎用UIプリミティブを提供する |
| Requirements | 3.4, 3.5 |

**Responsibilities & Constraints**
- `Accordion`・`AccordionItem`・`AccordionTrigger`・`AccordionContent`をエクスポートし、`Card`/`Badge`と同じ`components/ui/`配下の汎用プリミティブとして位置づける
- スタイリング以外のロジック（開閉判定・アクセシビリティ属性）はRadix本体に委譲し、本コンポーネントは独自のロジックを持たない

**Dependencies**
- External: `@radix-ui/react-accordion`（1.2.x） — 開閉ロジック・アクセシビリティ属性の提供 (P0)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management
- State model: `@radix-ui/react-accordion`の`Root`コンポーネントが管理する内部状態をそのまま利用する（本コンポーネントは状態を持たない）

**Implementation Notes**
- Integration: 将来的に他機能（FAQ以外）がアコーディオンUIを必要とする場合、本コンポーネントを再利用できる
- Validation: 該当なし
- Risks: なし

## Data Models

### Domain Model
- `Faq`は本仕様が新規に定義する独立したドメイン型であり、既存の`Announcement`/`Link`/`Inquiry`型とは無関係
- 属性: `id`（一意識別子）・`category`（`FaqCategory`）・`question`（質問文）・`answer`（回答文）
- 静的モックデータは`lib/api/faqs.ts`内に配列として保持する

### Logical Data Model
| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | 一意識別子 |
| `category` | `FaqCategory`（`"inquiry_method" \| "form_input" \| "status" \| "other"`） | カテゴリコード（仮値、ヒアリング後に変更前提） |
| `question` | `string` | 質問文 |
| `answer` | `string` | 回答文 |

### Data Contracts & Integration

**モックAPI契約**
- `getFaqs(): Promise<Faq[]>` — FAQ全件を返す（並び順の保証なし）

## Error Handling

### Error Strategy
- **一覧取得失敗**: `FaqList`内の`try/catch`でエラーメッセージ（翻訳キー経由）を表示する
- **FAQが0件**: `FaqList`が空状態メッセージ（翻訳キー経由）を表示する

### Monitoring
- フェーズ1ではモックAPIのためサーバーサイド監視は対象外

## Testing Strategy

- **Unit Tests**: `getFaqs`が全件を返すことの検証
- **Integration Tests**: `FaqList`の空状態・エラー状態の表示切り替え、`FaqAccordion`の質問クリックによる回答表示/非表示の切り替え、複数質問の独立した開閉状態
- **E2E/UI Tests**: カテゴリ別グループ表示、キーボード操作（Enter/Space）による開閉、`aria-expanded`属性の確認、日英切り替え、タブレット幅でのアコーディオン展開時のレイアウト崩れ確認

## Security Considerations
- 本仕様は読み取り専用のモックデータのみを扱い、外部入力の受け付けは行わない。質問・回答文の表示はReactの標準エスケープに依拠し、`dangerouslySetInnerHTML`を使用しない

---

# 追加設計: 申請者側FAQ UX改善（2026-07-22 追記）

2026-07-22 のプロダクト全体レビューで発見した申請者側FAQの3課題（回答の改行消失・更新日/新着表示なし・キーワード検索なし）への対応設計。要件8・9・10 に対応する。既存の Server/Client 分離アーキテクチャは維持し、開閉状態に加えて「キーワード検索状態」を`FaqAccordion`より上位のClient Componentへ持ち上げる点のみが構造上の変更となる。

## Requirements Traceability（追記分）

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 8.1–8.2 | 回答の改行・書式保持表示 | FaqAccordion | - | - |
| 9.1 | `updatedAt`カラム新設 | （データモデル）Faq / faq-service | listFaqs 拡張 | - |
| 9.2–9.5 | 更新日・新着バッジ表示 | FaqAccordion（またはFaqListClient） | faq-utils.isRecentlyUpdated | - |
| 10.1–10.6 | 申請者側キーワード検索 | FaqListClient（新規, Client）, FaqList | faq-utils.filterFaqs | 検索フィルタフロー |

## Boundary Commitments（追記分）

### This Spec Owns（追記）
- 申請者側FAQ表示のための `Faq` 型へのタイムスタンプ追加（`createdAt`/`updatedAt`）
- 申請者側読み取り経路（`lib/api/faqs.ts` の `getFaqs`、`lib/server/faq-service.ts` の `mapFaq`/`listFaqs`）のタイムスタンプ露出
- FAQ用ユーティリティ（`src/lib/faq-utils.ts`、新規）: 新着判定・キーワード絞り込み
- 申請者側の検索UI・状態管理（`FaqListClient`、新規Client Component）
- `faq` 名前空間への翻訳キー追加（更新日ラベル・新着バッジ・検索欄）

### 共有基盤への変更（画面ではないため 1画面=1spec に非抵触）
- `prisma/schema.prisma` の `Faq` モデルへの `updatedAt DateTime @updatedAt` 追加と対応するPrismaマイグレーション新規作成
- `faq-service.ts` は `faq-management`spec が作成・所有するが、`mapFaq`/`listFaqs`（申請者側読み取り経路）へのタイムスタンプ露出は後方互換な追加であり、`faq-management` の書き込み経路・ヘルプデスク一覧（`listFaqsForHelpdesk`）の既存挙動を壊さない

## データモデル変更（要件9.1）

### schema.prisma
```prisma
model Faq {
  id        String      @id @default(cuid())
  category  FaqCategory
  question  String
  answer    String
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt   // 追加
}
```
- 既存レコードへのバックフィル: `@updatedAt`は既存行に対してマイグレーション時のデフォルトが必要。マイグレーションは `updatedAt` を `NOT NULL` で追加し、既存行には `createdAt` 相当（またはマイグレーション実行時刻）を初期値として設定する（`ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` 後にデフォルト除去、もしくはPrisma生成のマイグレーションSQLを手直しして既存行を`createdAt`で埋める）
- 本番反映（Cloud SQL への `prisma migrate deploy`）は main 統合後に別途手動実行が必要（プロジェクト既知の運用: マイグレーション反映漏れに注意）

### 型・サービス層の変更
- `src/types/faq.ts`: `Faq` インターフェースに `createdAt: string` と `updatedAt: string`（ISO文字列）を追加する。`CreateFaqInput = Omit<Faq, "id" | "createdAt" | "updatedAt">` に修正し、`faq-management` の作成・更新入力からタイムスタンプを除外する（後方互換: フォーム側は question/answer/category のみを送るため影響なし）
- `src/lib/server/faq-service.ts`: `mapFaq` の戻り値に `createdAt`/`updatedAt`（`toISOString()`）を含める。`listFaqs` はこの拡張された `mapFaq` を通すのみ。`FaqWithTimestamp` は `Faq` が既に両タイムスタンプを持つため冗長化する場合は `Faq` へ統合可（互換維持のため別名は残してよい）
- `src/lib/api/faqs.ts`: `getFaqs` の戻り値型は `Faq[]` のまま（型拡張により自動的にタイムスタンプを含む）

## Components and Interfaces（追記分）

### FaqAccordion の変更（要件8, 9）
- **改行保持（要件8）**: `AccordionContent` 内の回答表示に `whitespace-pre-wrap`（および長い行の折り返し用に `break-words`）クラスを付与する。現在の `<AccordionContent>{faq.answer}</AccordionContent>` を `<AccordionContent><p className="whitespace-pre-wrap break-words">{faq.answer}</p></AccordionContent>` 相当に変更する。`dangerouslySetInnerHTML` は使わずReact標準エスケープを維持する
- **更新日・新着バッジ（要件9）**: 各 `AccordionTrigger`（またはその近傍）に、更新日（`updatedAt` を `toLocaleDateString(locale)` で整形）と、`isRecentlyUpdated(updatedAt)` が真のとき既存 `Badge` コンポーネントで「新着」ラベルを表示する。ロケールは Server Component（`FaqList`）から props で受け取るか、`FaqAccordion` を薄いClient のままにするため日付整形済み文字列・新着フラグを props で渡す設計を推奨（Client Component内で `getLocale` は使えないため、整形はServer側 or `next-intl`クライアントフックで行う）

### faq-utils.ts（新規, 要件9.5・10.2）
```typescript
// 新着判定（documents の isRecentlyUploaded を踏襲）
export const FAQ_NEW_BADGE_DAYS = 7;
export function isRecentlyUpdated(updatedAt: string, now?: Date): boolean;

// キーワード絞り込み（question / answer の部分一致・大文字小文字非依存）
export function filterFaqs(faqs: Faq[], keyword: string): Faq[];
```
- `isRecentlyUpdated`: `document-utils.ts` の `isRecentlyUploaded` と同一ロジック（`diffDays <= FAQ_NEW_BADGE_DAYS`、未来日は false）。基準日数は本定数の変更のみで調整可能（要件9.5）
- `filterFaqs`: `filterDocuments` を踏襲。`keyword` を trim+lowercase し、空なら入力配列をそのまま返す。`question`・`answer` のいずれかに部分一致するものを返す（要件10.2, 10.3）

### FaqListClient（新規, Client Component, 要件10）
- **配置**: `FaqList`（Server）が全件取得・エラー/空状態のハンドリングを担い、正常系のFAQ配列を `FaqListClient` に渡す。`FaqListClient` がキーワード状態（`useState`）を保持し、`filterFaqs` で絞り込んだ結果をカテゴリ別グループ（`FaqCategoryGroup`）へ流す。`DocumentManagementListClient`（ドキュメント管理側のクライアント絞り込み）と同じ設計方針
- **カテゴリ別グループ化の移設**: 現在 `FaqList`（Server）が持つ `FAQ_CATEGORY_CODES.map` によるグループ化ループを `FaqListClient` 側へ移す（絞り込み後の配列に対してグループ化するため）。空カテゴリの非表示挙動（要件10.6）は既存ロジックをそのまま維持
- **検索UI**: 上部にキーワード入力欄（既存 `Input` + `Label`）を配置。`DocumentManagementFilterBar` のキーワード欄と同じ構成。カテゴリ絞り込みセレクトは申請者側要件になし（キーワードのみ）
- **0件表示（要件10.4）**: 絞り込み結果が0件のとき `faq.search.noResults` を表示
- **ロケール依存の日付整形**: `FaqListClient` は Client のため、`next-intl` の `useFormatter`/`useLocale` を用いて更新日を整形するか、Server側で整形済み文字列を各FAQに付与して渡す。実装者はいずれかを選択（推奨: `useLocale()` + `toLocaleDateString`）

### 翻訳キー（追記分, `faq` 名前空間）
`messages/ja.json` / `messages/en.json` の `faq` に以下を追加（ja例）:
```jsonc
"faq": {
  "list": {
    "updatedLabel": "更新日",          // 要件9.4
    "newBadge": "新着"                 // 要件9.3, 9.4
  },
  "search": {                          // 要件10.5
    "label": "キーワード検索",
    "placeholder": "質問や回答に含まれる語句",
    "noResults": "該当するFAQがありません",
    "clearButton": "条件をクリア"
  }
}
```
en 側も同一キー構造で英語文言を追加する（`updatedLabel`="Updated", `newBadge`="New", `search.label`="Search", `search.placeholder`="Keyword in question or answer", `search.noResults`="No matching FAQs", `search.clearButton`="Clear"）。

## File Structure Plan（追記分）

### 新規
```
src/lib/faq-utils.ts                         # isRecentlyUpdated / FAQ_NEW_BADGE_DAYS / filterFaqs
src/components/features/faq/FaqListClient.tsx # 検索状態＋カテゴリ別グループ化（Client）
prisma/migrations/<timestamp>_add_faq_updated_at/  # updatedAt追加マイグレーション
```

### 変更
```
prisma/schema.prisma                         # Faq に updatedAt @updatedAt 追加
src/types/faq.ts                             # Faq に createdAt/updatedAt 追加、CreateFaqInput 修正
src/lib/server/faq-service.ts                # mapFaq にタイムスタンプ露出
src/components/features/faq/FaqList.tsx      # グループ化を FaqListClient へ委譲、client へ配列を受け渡し
src/components/features/faq/FaqAccordion.tsx # whitespace-pre-wrap、更新日・新着バッジ表示
messages/ja.json, messages/en.json           # faq.list.updatedLabel / faq.list.newBadge / faq.search.*
```

## Error Handling / Testing（追記分）
- 検索は純粋にクライアント側フィルタで完結し、取得エラー・空状態は既存の `FaqList`（Server）のハンドリングを維持する
- **Unit**: `faq-utils` の `isRecentlyUpdated`（境界値: 7日ちょうど=true、7日超=false、未来日=false）、`filterFaqs`（空キーワード=全件、question一致、answer一致、大文字小文字非依存、0件）
- **Integration**: `FaqAccordion` の回答に改行を含むデータで `whitespace-pre-wrap` が適用されること、更新日が新しいFAQに新着バッジが出ること、`FaqListClient` のキーワード入力で該当FAQのみ表示・0件時メッセージ表示

---

## 一貫性整備（要件11・2026-07-23 追記）

### 方針
FAQを`documents`/`links`の検索実装パターンへ寄せる純粋なリファクタ＋レイアウト調整。挙動（要件10）は不変。3機能の単一UIコンポーネントへの統合は行わない（要件11「設計判断」参照）。

### `FaqSearchBar`（新規, Client Component, 要件11.1・11.2）
- `src/components/features/faq/FaqSearchBar.tsx` を新規作成し、`DocumentSearchBar`/`LinkSearchBar` と同一の設計・マークアップにする:
  ```tsx
  export interface FaqSearchBarProps {
    keyword: string;
    onChange: (keyword: string) => void;
    onClear: () => void;
  }
  // 内部で const t = useTranslations("faq.search");
  // <div className="flex flex-wrap items-end gap-4">
  //   <div className="flex-1 space-y-1 min-w-[240px]"> <Label htmlFor="faq-search-keyword">{t("keywordLabel")}</Label>
  //     <Input id="faq-search-keyword" value={keyword} placeholder={t("keywordPlaceholder")} onChange=... /> </div>
  //   <Button type="button" variant="outline" onClick={onClear}>{t("clearButton")}</Button>
  // </div>
  ```
- 状態は保持せず、`onChange`/`onClear` で呼び出し元（`FaqListClient`）へ通知する（`DocumentSearchBar` と同じ設計方針）。`id` は `faq-search-keyword` を維持（既存と同一）。

### `FaqListClient` の変更（要件11.2・11.5）
- 直書きの検索欄マークアップ（`<div className="flex flex-wrap items-end gap-4">…`）を `<FaqSearchBar keyword={keyword} onChange={setKeyword} onClear={() => setKeyword("")} />` に置き換える。
- props から `searchLabel`/`searchPlaceholder`/`searchNoResults`/`searchClearButton` を削除する。
- 0件表示は `useTranslations("faq.search")` を `FaqListClient` 側で取得して `t("noResults")` を表示するか、`FaqSearchBar` と同様に自己解決する（推奨: `FaqListClient` で `const tSearch = useTranslations("faq.search")` を用意し `tSearch("noResults")`。`LinkListClient` が `tSearch = useTranslations("links.search")` を持つのと同型）。
- `useState`・`filterFaqs`・`FAQ_CATEGORY_CODES` によるカテゴリ別グループ化・空カテゴリ非表示（要件10.6）は現状維持。

### `FaqList`（Server）の変更（要件11.2）
- `FaqListClient` へ渡していた `searchLabel`/`searchPlaceholder`/`searchNoResults`/`searchClearButton` の4propsと、それらを解決する `t("search.*")` 呼び出しを削除する。`categoryLabels`/`updatedLabel`/`newBadgeLabel` は現状のまま維持（本要件のスコープ外）。

### 翻訳キーの改称（要件11.3）
- `messages/ja.json`・`messages/en.json` の `faq.search` を以下へ改称し、`documents.search`/`links.search` とキー構造を一致させる:
  - `label` → `keywordLabel`
  - `placeholder` → `keywordPlaceholder`
  - `noResults` / `clearButton` は据え置き（既に一致）
- 文言（テキスト値）自体は変更しない。ja/en とも同一キー構造になることを確認する。

### 申請者ページの幅調整（要件11.4）
- `src/app/[locale]/(applicant)/faq/page.tsx` のルート `div` の `className` を `max-w-5xl` → `w-full` に変更し、`documents`/`links` ページ（いずれも `w-full`）と揃える。`AppShell` の `<main>` には max-width 制約がないため、この変更で3ページの本文幅が一致する。

### File Structure Plan（要件11 追記分）
**新規**
```
src/components/features/faq/FaqSearchBar.tsx   # 要件11.1（DocumentSearchBar/LinkSearchBar と同型）
```
**変更**
```
src/components/features/faq/FaqListClient.tsx  # 直書き検索欄→FaqSearchBar、検索文言propsの受け取り廃止
src/components/features/faq/FaqList.tsx        # 検索文言4propsの受け渡し・t("search.*")呼び出し削除
src/app/[locale]/(applicant)/faq/page.tsx      # max-w-5xl → w-full
messages/ja.json, messages/en.json             # faq.search.label→keywordLabel, placeholder→keywordPlaceholder
```

### Testing（要件11 追記分）
- 既存のFAQ検索テスト（`FaqListClient.test.tsx`）は、検索文言propsの受け渡し方法変更に追従して更新する（propsからの文言注入をやめ、`next-intl` プロバイダ配下でのレンダリングに切り替える／または `FaqSearchBar` 単体テストを追加）。
- 検索挙動（キーワード即時絞り込み・カテゴリ別表示維持・0件メッセージ・クリア）が要件10 から不変であることを回帰確認する（要件11.5）。
- `keywordLabel`/`keywordPlaceholder` の翻訳キーが ja/en 双方に存在し、旧 `label`/`placeholder` 参照が残っていないことを確認する。
- **E2E**: 日英で検索欄ラベル・更新日・新着バッジ・0件メッセージが切り替わること、タブレット幅で検索欄・アコーディオンが横スクロールを起こさないこと
