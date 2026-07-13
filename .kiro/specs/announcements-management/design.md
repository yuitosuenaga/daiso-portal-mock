# Technical Design

## Overview
本機能は、既存の`announcements`specが対象外としていたヘルプデスク側のお知らせ作成・編集・削除機能を実装し、あわせてお知らせごとに配信対象（全体一律 or 特定の国・地域）を指定できるようにする。**Purpose**: ヘルプデスク担当者が海外販社向けのお知らせを管理し、関係する販社にのみ的確に情報を届けられるようにする。**Users**: 日本側ヘルプデスク担当者（作成・編集・削除）と海外販社担当者（配信対象に応じてフィルタされた表示）。**Impact**: `Announcement`型に判別可能なユニオン型の`targeting`フィールドを追加し、既存の申請者側読み取り関数（`getAnnouncements`・`getRecentAnnouncements`・`getAnnouncementById`）を自社の国でスコープする。`helpdesk-inquiry-management`specで確立したServer Actions + 共有モックストアのパターンを踏襲する。

### Goals
- ヘルプデスク担当者がお知らせを作成・編集・削除できる
- お知らせごとに配信対象（全体一律 or 特定の国・地域）を指定できる
- 配信対象の指定が申請者側の表示に実際に反映される
- 変更が一覧・詳細・ダッシュボードウィジェットをまたいで一貫して反映される（画面遷移しても状態が残る）

### Non-Goals
- 認証・ロールベースアクセス制御
- お知らせの既読・未読管理
- メール・プッシュ通知等の配信機能
- `helpdesk-inquiry-management`（問い合わせ管理・テンプレート管理）機能自体の変更
- `helpdesk-portal-layout`が確立したルートセグメント・共通レイアウト構造自体の変更

## Boundary Commitments

### This Spec Owns
- `/[locale]/helpdesk/announcements`・`/[locale]/helpdesk/announcements/new`・`/[locale]/helpdesk/announcements/[id]/edit`配下の全ページ
- `Announcement`型への`targeting`フィールドの追加（後方互換な拡張、既存シードデータへの移行含む）
- お知らせの作成・編集・削除のServer Actions・モックAPIミューテーション・バリデーションスキーマ
- 申請者側読み取り関数（`getAnnouncements`・`getRecentAnnouncements`・`getAnnouncementById`）への自社国スコープフィルタの適用
- `src/lib/constants/current-company.ts`（`MOCK_CURRENT_COMPANY`の共有定数化）
- `HelpdeskSidebar`への「お知らせ管理」ナビゲーション項目の追加

### Out of Boundary
- `helpdesk-portal-layout`が所有するルートセグメント構造・`HelpdeskAppShell`・`HelpdeskHeader`自体の変更
- `helpdesk-inquiry-management`が所有する問い合わせ管理・テンプレート管理の画面・Server Actions
- 申請者側の`AnnouncementList`・`AnnouncementDetail`・`AnnouncementWidget`のレイアウト・操作性の変更（参照データ範囲の変更を除く）
- 認証・ロールベースアクセス制御の実装

### Allowed Dependencies
- 既存の`Announcement`型・`ANNOUNCEMENT_CATEGORY_CODES`（フィールド追加のみ、既存フィールドは変更しない）
- 既存の`INQUIRY_COUNTRY_CODES`（配信対象の国選択肢として再利用）
- `helpdesk-inquiry-management`が確立したServer Actions・`getGlobalMockStore`パターン（`src/lib/mock-store.ts`）
- 既存のUIプリミティブ（`Card`, `Button`, `Select`, `Input`, `Textarea`, `Label`）
- `HelpdeskSidebar`（項目追加のみ）

### Revalidation Triggers
- `Announcement`型のフィールド追加・変更（`announcements`・`dashboard`specが再確認する必要がある）
- `MOCK_CURRENT_COMPANY`の参照元変更（`inquiries.ts`・`announcements.ts`の両方が影響を受ける）
- `getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`のフィルタ挙動変更（既存の申請者側テストの前提が変わる）

## Architecture

### Existing Architecture Analysis
既存の`announcements`specは、`lib/api/announcements.ts`に読み取り専用のモックAPI（`getAnnouncements`・`getRecentAnnouncements`・`getAnnouncementById`）を持ち、申請者側の`AnnouncementList`・`AnnouncementDetail`・`dashboard`spec所有の`AnnouncementWidget`がこれらを呼び出している。変更系操作は存在しない。`helpdesk-inquiry-management`specにより、Server Actions + `getGlobalMockStore`による`globalThis`共有ストア + zodによるサーバー側バリデーションという変更系操作の標準パターンが確立済み（`research.md`参照）。

### Architecture Pattern & Boundary Map
`helpdesk-inquiry-management`と同一のパターンを踏襲する。

```mermaid
graph TB
    HelpdeskAnnouncementListPage[Helpdesk Announcement List Page]
    HelpdeskAnnouncementNewPage[Helpdesk Announcement New Page]
    HelpdeskAnnouncementEditPage[Helpdesk Announcement Edit Page]
    ApplicantAnnouncementList[Applicant Announcement List]
    ApplicantAnnouncementDetail[Applicant Announcement Detail]
    ApplicantAnnouncementWidget[Applicant Announcement Widget]

    HelpdeskAnnouncementListPage --> AnnouncementManagementList[Announcement Management List]
    HelpdeskAnnouncementListPage --> DeleteAnnouncementButton[Delete Announcement Button]
    HelpdeskAnnouncementNewPage --> AnnouncementForm[Announcement Form]
    HelpdeskAnnouncementEditPage --> AnnouncementForm
    HelpdeskAnnouncementEditPage --> DeleteAnnouncementButton

    AnnouncementForm --> AnnouncementActions[Announcement Server Actions]
    DeleteAnnouncementButton --> AnnouncementActions

    AnnouncementActions --> AnnouncementsStore[Announcements Mock Store]

    AnnouncementManagementList --> AnnouncementsStore
    ApplicantAnnouncementList --> AnnouncementsStore
    ApplicantAnnouncementDetail --> AnnouncementsStore
    ApplicantAnnouncementWidget --> AnnouncementsStore

    AnnouncementsStore --> CurrentCompany[Current Company Constant]
    ApplicantAnnouncementList --> CurrentCompany
    ApplicantAnnouncementDetail --> CurrentCompany
    ApplicantAnnouncementWidget --> CurrentCompany
```

**Architecture Integration**:
- 選択パターン: Server Actions + `globalThis`共有ストア（`helpdesk-inquiry-management`と同一パターン、比較検討は`research.md`参照）
- ドメイン境界: お知らせデータは単一の`AnnouncementsStore`（`lib/api/announcements.ts`が所有する配列）に集約し、ヘルプデスク側（無絞り込み）と申請者側（自社国スコープ）の両方がここから読む
- 既存パターンの維持: フォームは`react-hook-form`+`zod`、ページ構成（一覧→新規作成/編集）は`helpdesk-templates`と同じNext.js App Router構成を踏襲
- 新規コンポーネントの理由: 削除確認・配信対象選択はいずれもクライアント状態境界を持つため独立コンポーネントとして新設する
- Steering準拠: 表示テキストは全て`next-intl`翻訳キー経由、モックAPIは`lib/api/`に抽象化という既存規約を維持

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Frontend | Next.js App Router（既存, 14.2.35） | ページ構成・Server Actions | `helpdesk-inquiry-management`と同一パターン |
| Forms | react-hook-form + zod（既存） | お知らせ作成・編集フォームのバリデーション | `discriminatedUnion`で配信対象を検証 |
| UI | shadcn/ui（既存） | `Select`（種別・配信対象・国選択）, `Textarea`（本文） | 新規UIプリミティブの追加は不要。削除確認はブラウザ標準`confirm()`を使用（`research.md`参照） |
| Data / Mock | `lib/api/announcements.ts`の可変配列 + `getGlobalMockStore` | お知らせのCRUD状態管理 | フェーズ1限定。開発サーバー再起動でリセットされる |

## File Structure Plan

### Directory Structure
```
src/app/[locale]/helpdesk/announcements/
├── page.tsx                        # 一覧（全件表示・削除導線）
├── new/
│   └── page.tsx                    # 新規作成
└── [id]/
    └── edit/
        └── page.tsx                 # 編集・削除

src/components/features/helpdesk-announcements/
├── AnnouncementManagementList.tsx   # Server: 全件取得・一覧表示
├── AnnouncementForm.tsx             # Client: 新規作成・編集共用フォーム（配信対象選択を含む）
└── DeleteAnnouncementButton.tsx     # Client: confirm()による確認 + 削除アクション呼び出し

src/lib/api/
└── announcements.ts                 # 変更: 自社国スコープフィルタの適用、getAllAnnouncements/getAnnouncementByIdForHelpdesk/create/update/deleteの追加

src/lib/actions/
└── announcements.ts                 # 新規: "use server" Server Actions（create/update/delete）

src/lib/validation/
└── announcement.ts                  # 新規: お知らせフォームのzodスキーマ（配信対象のdiscriminatedUnion含む）

src/lib/constants/
└── current-company.ts               # 新規: MOCK_CURRENT_COMPANYを inquiries.ts から移設

src/types/
└── announcement.ts                  # 変更: `AnnouncementTargeting`判別可能ユニオン型、`Announcement.targeting`フィールドを追加

src/components/layout/
└── HelpdeskSidebar.tsx               # 変更: 「お知らせ管理」ナビゲーション項目を追加

messages/
├── ja.json                          # 変更: helpdeskAnnouncements名前空間、helpdeskNavへのキー追加
└── en.json                          # 同上
```

### Modified Files
- `src/types/announcement.ts` — `AnnouncementTargeting`型・`Announcement.targeting`フィールドを追加（既存フィールドは変更しない）
- `src/lib/api/announcements.ts` — `MOCK_ANNOUNCEMENTS`の全シードデータに`targeting: { scope: "all" }`を付与、`getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`を自社国スコープでフィルタ、`getAllAnnouncements`・`getAnnouncementByIdForHelpdesk`・`createAnnouncement`・`updateAnnouncement`・`deleteAnnouncement`を追加
- `src/lib/api/inquiries.ts` — `MOCK_CURRENT_COMPANY`の定義を`lib/constants/current-company.ts`からのimportに置き換える（挙動変更なし）
- `src/components/layout/HelpdeskSidebar.tsx` — `HELPDESK_NAV_ITEMS`に1項目追加
- `messages/ja.json` / `messages/en.json` — 新規名前空間・キーの追加

> 申請者側の`AnnouncementList`・`AnnouncementDetail`・`dashboard`spec所有の`AnnouncementWidget`は変更しない。これらが呼び出す`lib/api/announcements.ts`の関数シグネチャ（引数・戻り値の型）も変更せず、返却データの中身のみが自社国スコープに絞り込まれる。

## System Flows

お知らせの作成・編集・削除はいずれも「Client Component → Server Action → モックストア更新 → revalidatePath」という同一パターンに従う（`helpdesk-inquiry-management`のClaim切り替えフローと同型）ため、代表として削除フローのみ図示する。

```mermaid
sequenceDiagram
    participant User as ヘルプデスク担当者
    participant Button as DeleteAnnouncementButton
    participant Action as deleteAnnouncementAction
    participant Store as AnnouncementsStore
    participant Pages as 一覧/申請者側ページ

    User->>Button: 削除をクリック
    Button->>User: confirm()で確認ダイアログを表示
    User->>Button: 確認する
    Button->>Action: deleteAnnouncementAction(id)
    Action->>Store: 該当お知らせを配列から除去
    Action->>Pages: revalidatePath(ヘルプデスク一覧, 申請者側一覧/詳細, ダッシュボード)
    Pages-->>User: 削除後の一覧表示
```

- 作成・編集も同様に、Server Action内でzodスキーマ（`announcementFormSchema`）によるサーバー側バリデーションを行った後、モックストアを更新し、影響範囲の全ルート（ヘルプデスク側・申請者側・ダッシュボード）を`revalidatePath`で再検証する。

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1〜1.6 | ヘルプデスク側お知らせ一覧 | AnnouncementManagementList | AnnouncementsMockApi (Service) | — |
| 2.1〜2.4 | お知らせの新規作成 | AnnouncementForm, AnnouncementActions | Service | 削除フローと同型 |
| 3.1〜3.4 | お知らせの編集 | AnnouncementForm, AnnouncementActions | Service | 削除フローと同型 |
| 4.1〜4.3 | お知らせの削除 | DeleteAnnouncementButton, AnnouncementActions | Service | 削除フロー |
| 5.1〜5.4 | 配信対象の指定 | AnnouncementForm, AnnouncementsMockApi (バリデーション) | Service | — |
| 6.1〜6.3 | 申請者側での配信対象フィルタ | AnnouncementsMockApi（`getAnnouncements`等の変更） | Service | — |
| 7.1〜7.2 | ナビゲーション統合 | HelpdeskSidebar | — | — |
| 8.1〜8.2 | 多言語対応 | 全新規コンポーネント | — | — |
| 9.1 | レスポンシブ対応 | （既存HelpdeskAppShellに依存、新規コンポーネントなし） | — | — |

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|---------------|---------------------------|-----------|
| AnnouncementManagementList | UI/Server | 全件のお知らせを取得・一覧表示 | 1.1〜1.6 | AnnouncementsMockApi (P0) | State |
| AnnouncementForm | UI/Client | タイトル・本文・種別・配信対象の入力・送信 | 2.1〜2.4, 3.1〜3.4, 5.1〜5.3 | AnnouncementActions (P0) | State |
| DeleteAnnouncementButton | UI/Client | 削除確認・削除アクション呼び出し | 4.1〜4.3 | AnnouncementActions (P0) | State |
| AnnouncementsMockApi（拡張） | Data/Mock | お知らせの読み取り（自社国スコープ/無絞り込み）・CRUD | 1.1, 5.4, 6.1〜6.2 | Announcement型 (P0), CurrentCompany (P0) | Service |
| AnnouncementActions | Server Actions | モックAPIのCRUDを呼び出し、`revalidatePath`で再検証する | 2.3, 3.3, 4.2 | AnnouncementsMockApi (P0) | Service |

### Data / Mock API

#### AnnouncementsMockApi（拡張）

| Field | Detail |
|-------|--------|
| Intent | 申請者側には自社国スコープのお知らせのみを、ヘルプデスク側には全件を提供し、CRUDを行う |
| Requirements | 1.1, 5.4, 6.1, 6.2 |

**Responsibilities & Constraints**
- `getAnnouncements`・`getRecentAnnouncements`・`getAnnouncementById`は、`targeting.scope === "all"`または`targeting.scope === "countries" && targeting.countries.includes(CurrentCompany.country)`を満たすお知らせのみを返す
- `getAllAnnouncements`・`getAnnouncementByIdForHelpdesk`は絞り込みを行わない
- ミューテーション（作成・編集・削除）は`getGlobalMockStore`で保持する配列を直接更新する

**Dependencies**
- Inbound: `AnnouncementActions`（P0）, `AnnouncementList`/`AnnouncementDetail`/`AnnouncementWidget`（既存、P0）, `AnnouncementManagementList`（P0）
- Outbound: `lib/constants/current-company.ts`（P0）

**Contracts**: Service [x]

##### Service Interface
```typescript
interface AnnouncementsMockApiExtension {
  getAllAnnouncements(): Promise<Announcement[]>;
  getAnnouncementByIdForHelpdesk(id: string): Promise<Announcement | null>;
  createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement>;
  updateAnnouncement(id: string, input: CreateAnnouncementInput): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
}
```
- Preconditions: `updateAnnouncement`/`deleteAnnouncement`の`id`は存在するお知らせのIDであること
- Postconditions: `createAnnouncement`で作成されたお知らせは、対象国であれば直後の`getAnnouncements`の結果に反映される
- Invariants: `getAnnouncements()`が返す配列は`getAllAnnouncements()`が返す配列の部分集合である

**Implementation Notes**
- Integration: 既存の`getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`のシグネチャ（引数・戻り値の型）は変更しない
- Validation: 存在しないIDに対する`updateAnnouncement`/`deleteAnnouncement`はエラーをthrowする
- Risks: プロセス再起動でリセットされる（フェーズ1のモック制約、`helpdesk-inquiry-management`と同様）

### Server Actions

#### AnnouncementActions

| Field | Detail |
|-------|--------|
| Intent | クライアントからのお知らせ作成・編集・削除操作を受け、サーバー側バリデーション・ミューテーション・関連ルートの再検証を行う |
| Requirements | 2.2〜2.3, 3.2〜3.3, 4.2, 5.3 |

**Responsibilities & Constraints**
- 全ての関数に`"use server"`を付与する
- `createAnnouncementAction`・`updateAnnouncementAction`は`announcementFormSchema`（zod）でタイトル・本文・種別・配信対象を検証し、不正な入力は保存せず例外を送出する（`helpdesk-inquiry-management`のHigh指摘を踏まえ、クライアント側バリデーションに加えて必ずサーバー側でも検証する）
- 各操作の最後に、ヘルプデスク側一覧・申請者側一覧・詳細・ダッシュボードルートを`revalidatePath`で再検証する

**Dependencies**
- Inbound: `AnnouncementForm`, `DeleteAnnouncementButton`（いずれもP0）
- Outbound: `AnnouncementsMockApiExtension`（P0）

**Contracts**: Service [x]

##### Service Interface
```typescript
interface AnnouncementActions {
  createAnnouncementAction(
    input: CreateAnnouncementInput
  ): Promise<Announcement>;
  updateAnnouncementAction(
    id: string,
    input: CreateAnnouncementInput
  ): Promise<Announcement>;
  deleteAnnouncementAction(id: string): Promise<void>;
}
```
- Preconditions: `input`はクライアント側で`react-hook-form`+`zod`によりバリデーション済みであること（サーバー側でも同一スキーマで再検証する）
- Postconditions: 成功時、対象ルート群が再検証され、次回アクセス時に最新状態が反映される
- Invariants: バリデーション失敗時はストアを変更しない

**Implementation Notes**
- Integration: `revalidatePath`の対象は`/[locale]/helpdesk/announcements`（page）, `/[locale]/announcements`（page）, `/[locale]/announcements/[id]`（page）, `/[locale]`（page、ダッシュボードの`AnnouncementWidget`用）
- Validation: サーバー側バリデーションはクライアント側と同一の`announcementFormSchema`を再利用する
- Risks: `revalidatePath`の対象漏れがあると一部画面の表示が古いまま残る（`helpdesk-inquiry-management`のMedium指摘と同種のリスク、実装時に全対象を確実に含める）

### Presentation Components（サマリーのみ）

- **AnnouncementManagementList**: `getAllAnnouncements()`を公開日降順で表示し、各行に編集リンクと`DeleteAnnouncementButton`を配置する。既存`TemplateList`と同じ構造パターンを踏襲する。
- **AnnouncementForm**: タイトル・本文・種別（既存カテゴリ）に加え、配信対象の選択（全体一律 or 特定の国・地域）を持つ`react-hook-form`+`zod`フォーム。国選択は複数選択可能なUIとする。新規作成・編集で共用する。
- **DeleteAnnouncementButton**: クリック時に`confirm()`でユーザーに確認し、確認後に`deleteAnnouncementAction`を呼び出す。

## Data Models

### Domain Model
- `Announcement`（既存、拡張）: `targeting: AnnouncementTargeting`を追加。
- `AnnouncementTargeting`（新規）: `{ scope: "all" } | { scope: "countries"; countries: string[] }`の判別可能なユニオン型。

### Logical Data Model
- `Announcement`は単一エンティティ。`targeting`はAnnouncementに埋め込まれた値オブジェクトであり、別エンティティとしての関連は持たない。

### Data Contracts & Integration

| 型 | 主なフィールド | 備考 |
|---|---|---|
| `Announcement`（拡張） | 既存フィールド + `targeting: AnnouncementTargeting` | 既存フィールドは変更なし |
| `AnnouncementTargeting` | `{ scope: "all" }` または `{ scope: "countries", countries: string[] }` | `countries`はISO 3166-1 alpha-2、`INQUIRY_COUNTRY_CODES`のいずれか |
| `CreateAnnouncementInput` | `title`, `body`, `category`, `targeting` | `Announcement`から`id`・`publishedAt`を除いたサブセット（`publishedAt`はサーバー側で保存時刻を採番） |

## Error Handling

### Error Strategy
`helpdesk-inquiry-management`と同様のパターンを踏襲する。Server Componentは取得失敗時にtry/catchでエラーメッセージを表示し、Server Actionsは不正な入力・存在しないIDに対してエラーをthrowし、呼び出し元のクライアントコンポーネントがエラー状態を表示する。

### Error Categories and Responses
- **データ取得失敗**（一覧）: 既存パターンと同様にエラーメッセージを表示
- **存在しないお知らせIDへの編集・削除操作**: Server Actionがエラーをthrowし、クライアント側でエラー表示にフォールバック
- **入力値不正**（タイトル・本文・種別未入力、配信対象の国が0件）: クライアント側`zod`バリデーションで送信をブロックし、フィールド単位のエラーメッセージを表示（要件2.2, 3.2, 5.3）。サーバー側でも同一スキーマで再検証する

### Monitoring
フェーズ1はモックのため、追加のロギング・監視基盤は導入しない。

## Testing Strategy

- **Unit Tests**:
  - `getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`が自社国（`CurrentCompany.country`）を含む、または`scope: "all"`のお知らせのみを返すこと
  - `getAllAnnouncements`が絞り込みなしで全件を返すこと
  - `createAnnouncement`/`updateAnnouncement`/`deleteAnnouncement`が対象のお知らせのみを操作し、他のレコードに影響しないこと
  - `announcementFormSchema`がタイトル・本文・種別の未入力、および`scope: "countries"`で0件選択を拒否すること
  - Server Actionsが不正な入力を拒否し、ストアを変更しないこと
- **Integration Tests**:
  - ヘルプデスク側でお知らせを作成後、申請者側の一覧・ダッシュボードウィジェットに反映されること（対象国が一致する場合）
  - 配信対象外の国向けに作成したお知らせが、申請者側の一覧・ダッシュボードウィジェットに表示されないこと
  - 削除後、ヘルプデスク側一覧・申請者側一覧の両方から除去されること
- **E2E/UI Tests**:
  - 日本語・英語両ロケールで一覧・作成・編集画面が表示されること
  - タブレット幅（768px）で新規画面が横スクロールを起こさないこと

## Security Considerations
配信対象フィルタは表示範囲の制御であり、認証・認可の代替ではない。フェーズ1は認証未実装のため、ヘルプデスク側の作成・編集・削除画面は`helpdesk-portal-layout`の前提通り制限なくアクセス可能である。フェーズ3で認証が導入される際、本specのルート境界を変更せずにアクセス制御を追加できることを設計上の前提とする。

---

## 追加ラウンド（2026-07-07）: タイトル・種別・対応要否による検索、対応要否フィールドの追加

### Overview（追加分）
お知らせ管理一覧にタイトル・種別・対応要否による検索・絞り込みを追加し、`Announcement`型に対応要否（`actionRequired`）フィールドを新設して作成・編集フォームで設定できるようにする。**Purpose**: ヘルプデスク担当者が登録件数の増加に対しても目的のお知らせを素早く見つけられるようにし、あわせて販社担当者への「対応要否」の伝達を可能にする。**Impact**: `Announcement`型へのフィールド追加（後方互換）と、`AnnouncementManagementList`のサーバー/クライアント分割。既存の一覧・作成・編集画面のレイアウト・操作性は維持する。

### Boundary Commitments（追加分）

**This Spec Owns（追加）**
- `Announcement.actionRequired: boolean`フィールドの追加、および作成・編集フォームでの設定
- お知らせ管理一覧の検索・絞り込みUI（`AnnouncementFilterBar`、`AnnouncementManagementListClient`、`lib/helpdesk-announcement-list.ts`）

**Out of Boundary（追加）**
- 対応要否バッジの申請者側での表示ロジック（`announcements`spec側で実装、本specは`actionRequired`フィールドの提供のみを担う）
- ダッシュボードの「お知らせ概要ウィジェット」への対応要否バッジの反映（`dashboard`/`dashboard-card-redesign`spec）

**Revalidation Triggers（追加）**
- `Announcement.actionRequired`の型・意味の変更（`announcements`specが再確認する必要がある）

### Architecture（追加分）

既存の「サーバーで全件取得 → クライアントコンポーネントでフィルタ」パターン（`helpdesk-inquiry-management`実績、`research.md`参照）を`AnnouncementManagementList`にも適用する。現状のサーバーコンポーネント1個構成を、データ取得のみを担うサーバーコンポーネントと、フィルタ状態を保持するクライアントコンポーネントに分割する。

```mermaid
graph TB
    AnnouncementManagementList[Announcement Management List Server]
    AnnouncementManagementListClient[Announcement Management List Client]
    AnnouncementFilterBar[Announcement Filter Bar]
    FilterLib[helpdesk-announcement-list filter fn]

    AnnouncementManagementList --> AnnouncementManagementListClient
    AnnouncementManagementListClient --> AnnouncementFilterBar
    AnnouncementManagementListClient --> FilterLib
    AnnouncementFilterBar --> AnnouncementManagementListClient
```

**Architecture Integration（追加分）**:
- 選択パターン: `helpdesk-inquiry-management`の`HelpdeskInquiryListClient`/`HelpdeskInquiryFilterBar`と同一パターン（比較検討は`research.md`参照）
- 新規コンポーネントの理由: フィルタ状態はクライアント側の一時状態であり、既存のサーバーコンポーネント（`AnnouncementManagementList`）とは責務が異なるため分離する
- Steering準拠: 表示テキストは全て`next-intl`翻訳キー経由という既存規約を維持

### Technology Stack（追加分・差分のみ）

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| UI | 既存`Select`（新規プリミティブなし） | `actionRequired`の2択入力・絞り込み | Checkbox/Switchは未導入のため`Select`で表現（`research.md`参照） |

### File Structure Plan（追加分）

```
src/components/features/helpdesk-announcements/
├── AnnouncementManagementList.tsx        # 変更: データ取得のみを担うサーバーコンポーネントに整理
├── AnnouncementManagementListClient.tsx  # 新規: フィルタ状態を保持し一覧を描画するクライアントコンポーネント
├── AnnouncementFilterBar.tsx             # 新規: キーワード・種別・対応要否の絞り込み入力
└── AnnouncementForm.tsx                  # 変更: 対応要否（actionRequired）のSelectフィールドを追加

src/lib/
└── helpdesk-announcement-list.ts         # 新規: HelpdeskAnnouncementFilters型・filterAnnouncementsForHelpdesk関数

src/types/
└── announcement.ts                       # 変更: Announcement.actionRequired: booleanを追加

src/lib/validation/
└── announcement.ts                       # 変更: announcementFormSchemaにactionRequired: z.boolean()を追加

src/lib/api/
└── announcements.ts                      # 変更: シードデータ全件にactionRequiredを付与

messages/
├── ja.json                               # 変更: helpdeskAnnouncements.list.filter, .actionRequiredBadge, .form.actionRequiredフィールドを追加
└── en.json                               # 同上
```

### Modified Files（追加分）
- `src/types/announcement.ts` — `Announcement`に`actionRequired: boolean`を追加（既存フィールドは変更しない）
- `src/lib/validation/announcement.ts` — `announcementFormSchema`に`actionRequired: z.boolean()`を追加
- `src/lib/api/announcements.ts` — `MOCK_ANNOUNCEMENTS`の全シードデータに`actionRequired`（既存データの内容に応じて`true`/`false`）を付与
- `src/components/features/helpdesk-announcements/AnnouncementForm.tsx` — 種別フィールドの直後に対応要否の`Select`（2択）を追加、初期値は新規作成時`false`
- `src/components/features/helpdesk-announcements/AnnouncementManagementList.tsx` — `getAllAnnouncements()`取得とエラー/空状態表示のみを担い、フィルタ済み一覧の描画を`AnnouncementManagementListClient`に委譲

### Requirements Traceability（追加分）

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 10.1〜10.5 | 対応要否フィールドの追加と設定 | AnnouncementForm, Announcement型, AnnouncementManagementListClient | Service | — |
| 11.1〜11.8 | タイトル・種別・対応要否による検索・絞り込み | AnnouncementFilterBar, AnnouncementManagementListClient, filterAnnouncementsForHelpdesk | State | — |

### Components and Interfaces（追加分）

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|---------------|---------------------------|-----------|
| AnnouncementManagementListClient | UI/Client | フィルタ状態を保持し、絞り込み済み一覧を描画 | 11.1〜11.8, 10.4 | filterAnnouncementsForHelpdesk (P0), AnnouncementFilterBar (P0) | State |
| AnnouncementFilterBar | UI/Client | キーワード・種別・対応要否の入力を受け付け、変更を通知 | 11.1〜11.4, 11.6 | — | State |
| filterAnnouncementsForHelpdesk | Lib/Pure Function | キーワード・種別・対応要否のAND条件でお知らせを絞り込む | 11.2〜11.4, 11.8 | — | Service |

#### filterAnnouncementsForHelpdesk

| Field | Detail |
|-------|--------|
| Intent | お知らせ配列をキーワード（タイトル部分一致）・種別・対応要否のAND条件で絞り込む純粋関数 |
| Requirements | 11.2, 11.3, 11.4, 11.8 |

**Responsibilities & Constraints**
- タイトルの部分一致判定は大文字・小文字を区別しない
- 各フィルタ条件が未指定（空文字列 or `undefined`）のときはその条件による絞り込みを行わない
- 入力配列の順序を変更しない（呼び出し側が公開日降順に整列済みであることを前提とする）

**Contracts**: State [x]

##### Service Interface
```typescript
interface HelpdeskAnnouncementFilters {
  keyword: string;
  category: string;
  actionRequired: "" | "true" | "false";
}

function filterAnnouncementsForHelpdesk(
  announcements: Announcement[],
  filters: HelpdeskAnnouncementFilters
): Announcement[];
```
- Preconditions: `announcements`は`getAllAnnouncements()`の戻り値（公開日降順）
- Postconditions: 戻り値は入力配列の部分集合であり、順序を維持する
- Invariants: `filters`が全て空文字列のとき、戻り値は入力配列と等しい

**Implementation Notes**
- Integration: `AnnouncementManagementListClient`が`useMemo`で本関数を呼び出す（`helpdesk-inquiry-management`の`filterInquiriesForHelpdesk`と同型）
- Validation: 型レベルで不正な`actionRequired`値を排除する（`"" | "true" | "false"`のUnion）
- Risks: なし（純粋関数、副作用なし）

### Data Models（追加分）

- `Announcement`（既存、再拡張）: `actionRequired: boolean`を追加。新規作成時の初期値は`false`（要件10.3）
- `CreateAnnouncementInput`は`Announcement`から`id`・`publishedAt`を除いたサブセットのため、`actionRequired`は自動的に含まれる（型定義の変更不要）

### Testing Strategy（追加分）

- **Unit Tests**:
  - `filterAnnouncementsForHelpdesk`がキーワード（部分一致・大小文字無視）・種別・対応要否のAND条件で絞り込むこと、全条件が空のとき全件を返すこと
  - `announcementFormSchema`が`actionRequired`を`boolean`として要求すること
- **Integration Tests**:
  - `AnnouncementManagementListClient`でキーワード・種別・対応要否を入力すると一覧が絞り込まれ、「クリア」で全件表示に戻ること
  - 絞り込み結果が0件のとき「該当するお知らせがありません」が表示されること
  - `AnnouncementForm`で対応要否を「対応が必要」に設定して保存すると、一覧にバッジが表示されること
- **E2E/UI Tests**:
  - 日本語・英語両方でフィルタバーのラベル・バッジ文言が翻訳されること
  - タブレット幅（768px）でフィルタバーが横スクロールを発生させないこと

---

## 追加ラウンド（2026-07-08）: 確認済み・実施済み人数の可視化と未対応者へのリマインド

### Overview（追加分）
アカウント機能未実装のフェーズ1では実測できないため、モックの「担当者」マスタ（既存`DOCUMENT_COMPANY_OPTIONS`の各社に2名ずつ、計16名）を新設し、お知らせごとに担当者単位の確認済み・実施済み状態をモックデータとして保持する。お知らせ管理一覧に確認済み／実施済み人数を表示し、クリックで未対応者一覧をダイアログ表示、個別・一括でリマインド送信（モック、実配信なし）できるようにする。**Purpose**: ヘルプデスク担当者が周知の浸透状況を人単位で把握し、対応漏れのある担当者にリマインドできるようにする。**Impact**: 新規の担当者マスタ・確認済み/実施済み/リマインド送信状態のモックストア、およびモーダル表示のための`Dialog`UIプリミティブ（本プロジェクト初導入）を追加する。既存のお知らせ作成・編集・削除・検索機能への変更はない。

### Goals（追加分）
- お知らせごとに確認済み人数・実施済み人数（対応要否ありのお知らせのみ）を一覧上で可視化する
- 未確認・未対応の担当者を一覧で確認できる
- 未対応の担当者へリマインドを送信できる（モック、実際の通知配信は行わない）

### Non-Goals（追加分）
- 実際のログイン・アカウント機能に基づくユーザー個人の識別
- メール・プッシュ通知等、実際の通知配信
- 海外販社側での確認済み・実施済み人数や未対応者一覧の表示（`announcements`spec側では、リマインド受信表示のみを対象とする。詳細は`announcements/design.md`参照）

### Boundary Commitments（追加分）

**This Spec Owns（追加）**
- 担当者マスタ（`AnnouncementRecipient`）のモックデータおよび型定義
- 担当者ごとの確認済み・実施済み・リマインド送信状態（`AnnouncementRecipientStatus`）のモックストアと読み取り・更新API
- お知らせ管理一覧の確認済み・実施済み人数表示、未対応者一覧ダイアログ、個別・一括リマインド送信のUI・Server Actions
- `Dialog`UIプリミティブ（`src/components/ui/dialog.tsx`、Radix UIベース、本プロジェクト初導入）

**Out of Boundary（追加）**
- 海外販社側でのリマインド受信表示ロジック（`announcements`specが実装。本specは参照可能な読み取り関数を提供するのみ）
- 実際のメール・プッシュ通知配信、送信履歴の恒久保存（プロセス再起動でリセットされるモックの範囲に留める）

**Allowed Dependencies（追加）**
- 既存の`DOCUMENT_COMPANY_OPTIONS`/`DOCUMENT_COMPANY_CODES`（`lib/constants/document-company-options.ts`、担当者の所属会社・国として再利用）
- 既存の`getGlobalMockStore`パターン（`lib/mock-store.ts`）
- 既存の`Announcement.targeting`/`Announcement.actionRequired`（集計対象の判定に使用、読み取りのみ）

**Revalidation Triggers（追加）**
- `AnnouncementRecipient`/`AnnouncementRecipientStatus`の型・意味の変更（`announcements`specが再確認する必要がある）
- 担当者マスタの会社紐付けロジック変更（`DOCUMENT_COMPANY_OPTIONS`に依存するため、その変更時も再確認する）

### Architecture（追加分）

お知らせ管理一覧（`AnnouncementManagementList`Server）が、お知らせ本体に加えて担当者別ステータス（`AnnouncementRecipientStatusView[]`）をお知らせごとに取得し、`AnnouncementManagementListClient`経由で各行に渡す。人数表示のクリックで開く`AnnouncementRecipientDialog`は、渡された配列から未対応者を算出して表示し、リマインド送信はServer Action経由でモックストアを更新後`revalidatePath`する（`helpdesk-inquiry-management`と同型のCRUDパターン）。

```mermaid
graph TB
    AnnouncementManagementList[Announcement Management List Server]
    AnnouncementManagementListClient[Announcement Management List Client]
    AnnouncementTrackingBadge[Announcement Tracking Badge]
    AnnouncementRecipientDialog[Announcement Recipient Dialog]
    TrackingApi[Announcement Tracking Mock Api]
    TrackingActions[Announcement Tracking Server Actions]
    TrackingStore[Announcement Recipient Status Store]
    RecipientMaster[Announcement Recipient Master]

    AnnouncementManagementList --> TrackingApi
    TrackingApi --> TrackingStore
    TrackingApi --> RecipientMaster
    AnnouncementManagementList --> AnnouncementManagementListClient
    AnnouncementManagementListClient --> AnnouncementTrackingBadge
    AnnouncementTrackingBadge --> AnnouncementRecipientDialog
    AnnouncementRecipientDialog --> TrackingActions
    TrackingActions --> TrackingStore
```

**Architecture Integration（追加分）**:
- 選択パターン: 既存と同じ「サーバーで取得 → クライアントで表示・操作」+ Server Actions更新パターン
- ドメイン境界: 担当者マスタ・ステータスは新設の`TrackingApi`（`lib/api/announcement-tracking.ts`）に集約し、`Announcement`本体のデータ（`lib/api/announcements.ts`）とは別ストアとして分離する（`announcementId`で疎結合に参照）
- 新規コンポーネントの理由: 人数表示・未対応者ダイアログはお知らせ本体の一覧表示とは異なる操作境界（クリックでの状態取得・リマインド送信）を持つため独立コンポーネントとする
- Steering準拠: 表示テキストは全て`next-intl`翻訳キー経由、モックAPIは`lib/api/`に抽象化という既存規約を維持

### Technology Stack（追加分・差分のみ）

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| UI | `@radix-ui/react-dialog`（新規導入） + shadcn/uiパターンの`Dialog`ラッパー | 未対応者一覧のモーダル表示 | 本プロジェクトに`Dialog`系プリミティブが存在しないため新規追加。既存の`@radix-ui/react-accordion`と同じ導入パターン（Radix Primitive + `class-variance-authority`不要のシンプルラップ）に揃える |
| Data / Mock | `lib/api/announcement-tracking.ts`の可変配列 + `getGlobalMockStore` | 担当者ごとの確認済み・実施済み・リマインド送信状態の管理 | フェーズ1限定。開発サーバー再起動でリセットされる |

### File Structure Plan（追加分）

```
src/components/ui/
└── dialog.tsx                              # 新規: Radix UI Dialogのshadcn/uiスタイルラッパー

src/lib/constants/
└── announcement-recipients.ts              # 新規: 担当者マスタ（DOCUMENT_COMPANY_OPTIONS各社2名、計16名）

src/types/
└── announcement-recipient.ts               # 新規: AnnouncementRecipient, AnnouncementRecipientStatus, AnnouncementRecipientStatusView型

src/lib/api/
└── announcement-tracking.ts                # 新規: 集計・未対応者取得・リマインド送信・自社宛リマインド有無判定のモックAPI

src/lib/actions/
└── announcement-tracking.ts                # 新規: "use server" リマインド送信Server Actions

src/components/features/helpdesk-announcements/
├── AnnouncementTrackingBadge.tsx           # 新規Client: 確認済み/実施済み人数を表示し、クリックでダイアログを開く
├── AnnouncementRecipientDialog.tsx         # 新規Client: 未対応者一覧・個別/一括リマインド送信・送信完了メッセージ表示
└── AnnouncementManagementList.tsx          # 変更: お知らせ本体に加え担当者別ステータスを取得し、Clientへ渡す

messages/
├── ja.json                                 # 変更: helpdeskAnnouncements.tracking名前空間を追加
└── en.json                                 # 同上
```

### Modified Files（追加分）
- `src/components/features/helpdesk-announcements/AnnouncementManagementList.tsx` — `getAllAnnouncements()`に加え`getAnnouncementRecipientStatuses(announcement.id)`を各お知らせについて取得し、`AnnouncementManagementListClient`へ`recipientStatuses`を追加のpropsとして渡す

### System Flows（追加分）

```mermaid
sequenceDiagram
    participant User as ヘルプデスク担当者
    participant Badge as AnnouncementTrackingBadge
    participant Dialog as AnnouncementRecipientDialog
    participant Action as sendAnnouncementRemindersAction
    participant Store as AnnouncementRecipientStatusStore

    User->>Badge: 確認済み/実施済み人数をクリック
    Badge->>Dialog: ダイアログを開く（未対応者一覧を表示）
    User->>Dialog: 個別または一括でリマインドを選択
    Dialog->>Action: sendAnnouncementRemindersAction(announcementId, recipientIds)
    Action->>Store: 対象担当者のreminderSentAtを記録
    Action-->>Dialog: revalidatePath後の最新状態
    Dialog-->>User: 送信完了メッセージ・送信済み表示を更新
```

- リマインド送信は実際の通知配信を行わず、`reminderSentAt`の記録と`revalidatePath`によるヘルプデスク側一覧・申請者側一覧/詳細の再検証のみを行う（申請者側のリマインド受信表示に反映するため）。

### Requirements Traceability（追加分）

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 12.1〜12.4 | 担当者マスタのモックデータ | AnnouncementRecipient定数, AnnouncementTrackingMockApi | Service | — |
| 13.1〜13.5 | 確認済み・実施済み人数の表示 | AnnouncementTrackingBadge, AnnouncementManagementList | Service | — |
| 14.1〜14.6 | 未対応者一覧とリマインド | AnnouncementRecipientDialog, AnnouncementTrackingActions | Service | リマインド送信フロー |

### Components and Interfaces（追加分）

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|---------------|---------------------------|-----------|
| AnnouncementTrackingMockApi | Data/Mock | 担当者マスタ・確認済み/実施済み/リマインド状態の読み取りと算出 | 12.1〜12.4, 13.1〜13.4 | AnnouncementRecipient定数 (P0), Announcement.targeting/actionRequired (P0) | Service |
| AnnouncementTrackingActions | Server Actions | リマインド送信を受け、モックストアを更新し関連ルートを再検証する | 14.4〜14.5 | AnnouncementTrackingMockApi (P0) | Service |
| AnnouncementTrackingBadge | UI/Client | 確認済み/実施済み人数を表示し、クリックでダイアログを開く | 13.1〜13.5 | AnnouncementRecipientDialog (P0) | State |
| AnnouncementRecipientDialog | UI/Client | 未対応者一覧の表示、個別/一括リマインド送信、送信完了表示 | 14.1〜14.6 | AnnouncementTrackingActions (P0) | State |

#### AnnouncementTrackingMockApi

| Field | Detail |
|-------|--------|
| Intent | お知らせごとの対象担当者（配信対象でスコープ）を算出し、確認済み・実施済み件数、未対応者一覧、自社宛リマインド有無を提供する |
| Requirements | 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4 |

**Responsibilities & Constraints**
- `targeting.scope === "all"`のときは全16担当者、`targeting.scope === "countries"`のときは対象国に属する担当者のみを集計対象とする
- 実施済み件数は`actionRequired === true`のお知らせについてのみ意味を持つ値として提供する（`actionRequired === false`のときは`null`を返し、呼び出し側が非表示にする）
- モックデータは`getGlobalMockStore`で保持し、プロセス内で状態を維持する

**Dependencies**
- Inbound: `AnnouncementManagementList`（P0）, `AnnouncementTrackingActions`（P0）, `announcements`spec側の一覧・詳細コンポーネント（P1、自社宛リマインド有無の参照のみ）
- Outbound: `lib/constants/announcement-recipients.ts`（P0）, `lib/constants/document-company-options.ts`（P0）

**Contracts**: Service [x]

##### Service Interface
```typescript
interface AnnouncementRecipientStatusView {
  recipientId: string;
  companyCode: string;
  companyName: string;
  country: string;
  contactName: string;
  confirmedAt: string | null;
  completedAt: string | null;
  reminderSentAt: string | null;
}

interface AnnouncementTrackingSummary {
  totalRecipients: number;
  confirmedCount: number;
  completedCount: number | null;
}

interface AnnouncementTrackingMockApi {
  getAnnouncementRecipientStatuses(
    announcementId: string
  ): Promise<AnnouncementRecipientStatusView[]>;
  getAnnouncementTrackingSummary(
    announcementId: string
  ): Promise<AnnouncementTrackingSummary>;
  isReminderPendingForCompany(
    announcementId: string,
    companyCode: string
  ): Promise<boolean>;
}
```
- Preconditions: `announcementId`は存在するお知らせのIDであること
- Postconditions: `getAnnouncementRecipientStatuses`が返す配列の長さは、当該お知らせの配信対象に含まれる担当者数と一致する
- Invariants: `completedCount`は`actionRequired === false`のとき常に`null`。`isReminderPendingForCompany`は、対象担当者のいずれかが`reminderSentAt !== null && completedAt === null`のときのみ`true`を返す

**Implementation Notes**
- Integration: `announcements`spec（`AnnouncementList`/`AnnouncementDetail`）は`isReminderPendingForCompany(announcementId, MOCK_CURRENT_COMPANY.companyCode)`を読み取り専用で呼び出す
- Validation: 存在しない`announcementId`に対しては空集計（`totalRecipients: 0`等）を返す
- Risks: プロセス再起動でリセットされる（フェーズ1のモック制約）

#### AnnouncementTrackingActions

| Field | Detail |
|-------|--------|
| Intent | クライアントからのリマインド送信操作を受け、モックストアを更新し関連ルートを再検証する |
| Requirements | 14.4, 14.5 |

**Responsibilities & Constraints**
- `"use server"`を付与する
- 実際の通知配信は行わず、対象担当者の`reminderSentAt`に現在時刻を記録するのみ
- 処理後、ヘルプデスク側お知らせ一覧・申請者側一覧・詳細ルートを`revalidatePath`で再検証する（申請者側のリマインド受信表示への反映のため）

**Dependencies**
- Inbound: `AnnouncementRecipientDialog`（P0）
- Outbound: `AnnouncementTrackingMockApi`（P0）

**Contracts**: Service [x]

##### Service Interface
```typescript
interface AnnouncementTrackingActions {
  sendAnnouncementRemindersAction(
    announcementId: string,
    recipientIds: string[]
  ): Promise<void>;
}
```
- Preconditions: `recipientIds`は当該お知らせの対象担当者に含まれるIDであること
- Postconditions: 対象担当者全員の`reminderSentAt`が更新される
- Invariants: 既に`completedAt`が設定されている担当者へは送信対象から除外する（呼び出し元のダイアログが未対応者のみを渡す前提）

**Implementation Notes**
- Integration: 個別送信・一括送信のいずれも同一アクションを`recipientIds`の要素数のみを変えて呼び出す
- Validation: `recipientIds`が空配列のときは何もせず正常終了する
- Risks: なし（`revalidatePath`漏れ以外の副作用はない。対象ルートは既存の`AnnouncementActions`と同一集合を再利用する）

#### Presentation Components（サマリーのみ）

- **AnnouncementTrackingBadge**: お知らせ本体・`AnnouncementRecipientStatusView[]`を受け取り、「確認済み X/Y人」（`actionRequired`が真の場合は「実施済み X/Y人」も併記）を表示する。クリックで対象状態（確認済み or 実施済み）を指定して`AnnouncementRecipientDialog`を開く。
- **AnnouncementRecipientDialog**: 新設の`Dialog`プリミティブを用い、未対応の担当者（氏名・所属会社・国・送信済み状態）を一覧表示する。各行に個別リマインドボタン、一覧上部に一括リマインドボタンを配置し、送信後は`Alert`（`variant="success"`）で完了メッセージを表示する。

### Data Models（追加分）

- `AnnouncementRecipient`（新規）: `{ id, companyCode, companyName, country, contactName }`。`DOCUMENT_COMPANY_OPTIONS`の各社について2名、計16件をモックデータとして保持する
- `AnnouncementRecipientStatus`（新規）: `{ announcementId, recipientId, confirmedAt: string | null, completedAt: string | null, reminderSentAt: string | null }`。お知らせ×担当者の組ごとに保持する
- 初期シードデータには、`MOCK_CURRENT_COMPANY`（VN）に属する担当者について、`actionRequired: true`の既存お知らせの1件に対し`reminderSentAt`が設定済み・`completedAt`が`null`の状態を含める（`announcements`spec側のリマインド受信表示をアプリ起動直後から確認できるようにするため）

### Testing Strategy（追加分）

- **Unit Tests**:
  - `getAnnouncementTrackingSummary`が`targeting.scope`に応じて対象担当者数を正しく算出すること、`actionRequired === false`のとき`completedCount`が`null`になること
  - `isReminderPendingForCompany`が、対象担当者に`reminderSentAt`があり`completedAt`が`null`のときのみ`true`を返すこと
  - `sendAnnouncementRemindersAction`が対象担当者のみの`reminderSentAt`を更新し、他の担当者・他のお知らせに影響しないこと
- **Integration Tests**:
  - お知らせ管理一覧で確認済み人数をクリックすると、未確認の担当者のみがダイアログに表示されること
  - 一括リマインド送信後、ダイアログ内の対象者が「送信済み」表示に切り替わること
- **E2E/UI Tests**:
  - 日本語・英語両方で人数表示・ダイアログ内文言が翻訳されること
  - タブレット幅（768px）でダイアログが横スクロールを発生させずに表示されること

---

## 追加ラウンド（2026-07-08）: 公開期間・対応期限の設定

### Overview（追加分）
`Announcement`に公開期間（`publishStartDate`/`publishEndDate`）と対応期限（`dueDate`）を追加する。両フィールドともISO日付文字列（`YYYY-MM-DD`）の任意項目とし、既存の`AnnouncementForm`（作成・編集共用）にネイティブの`<input type="date">`を用いた入力欄を追加する。**Purpose**: 期限切れの周知を表示し続けない・対応期限を明確化するため。**Impact**: `Announcement`型・`announcementFormSchema`・`AnnouncementsMockApi`（`isVisibleToCurrentCompany`相当の判定）・`AnnouncementForm`・`AnnouncementManagementListClient`を変更する。新規コンポーネント・新規依存パッケージの追加はない。既存の`updateAnnouncement`が`actionRequired`を更新していない既存バグも本ラウンドで併せて修正する（対応期限の更新と同じ代入ブロックを触るため）。

### Goals（追加分）
- 公開期間が設定されたお知らせを、期間外は申請者側に表示しない（未設定時は常時公開）
- 対応要否が真のお知らせに対応期限の入力を必須化する
- 対応期限を申請者側の一覧・詳細画面にも表示する

### Non-Goals（追加分）
- 対応期限超過時の自動状態変更・自動エスカレーション通知
- 公開期間・対応期限の変更履歴の保持

### Boundary Commitments（追加分）

**This Spec Owns（追加）**
- `Announcement.publishStartDate`/`publishEndDate`/`dueDate`の型定義・バリデーション・フォーム入力・ヘルプデスク側一覧表示
- 公開期間による申請者側読み取り関数（`getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`）の可視性判定ロジック（要件6の配信対象フィルタと同じ関数群への追加）

**Out of Boundary（追加）**
- 対応期限の申請者側UIでの表示自体（`announcements`spec側が実装。本specは`Announcement.dueDate`を提供するのみ）

**Allowed Dependencies（追加）**: 変更なし（既存の`AnnouncementsMockApiExtension`・`announcementFormSchema`の拡張のみ）

**Revalidation Triggers（追加）**
- `Announcement.dueDate`/`publishStartDate`/`publishEndDate`の型・意味の変更（`announcements`specが再確認する必要がある）

### Architecture（追加分）
新規コンポーネント・新規フローは発生しない。既存の`AnnouncementsMockApiExtension`内の可視性判定関数（`isVisibleToCurrentCompany`）に公開期間チェックを合成し、既存の`AnnouncementForm`・`AnnouncementManagementListClient`にフィールドを追加する形で対応する。

**Architecture Integration（追加分）**:
- 既存パターン踏襲: 可視性判定は既存の`isVisibleToCurrentCompany`（`lib/api/announcements.ts`）に`isWithinPublishPeriod`判定を`&&`で合成する形で拡張し、`getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`のシグネチャは変更しない
- 新規コンポーネントを作らない理由: 入力欄・表示項目の追加のみであり、既存コンポーネントの責務範囲に収まるため

### Technology Stack（追加分・差分のみ）
追加・変更なし（既存の`react-hook-form`+`zod`、ネイティブHTML `<input type="date">`のみを使用し、日付ピッカー等の新規ライブラリは導入しない）。

### File Structure Plan（追加分）
新規ファイルなし。以下を変更する。

### Modified Files（追加分）
- `src/types/announcement.ts` — `Announcement`に`publishStartDate: string | null`, `publishEndDate: string | null`, `dueDate: string | null`を追加
- `src/lib/validation/announcement.ts` — 上記3フィールドのスキーマ追加、`superRefine`で「終了日は開始日以降」「`actionRequired`が真なら`dueDate`必須」を検証
- `src/lib/api/announcements.ts` — `isVisibleToCurrentCompany`に公開期間チェックを合成、`createAnnouncement`/`updateAnnouncement`で新フィールドを保存・更新（`updateAnnouncement`の`actionRequired`更新漏れも修正）
- `src/components/features/helpdesk-announcements/AnnouncementForm.tsx` — 公開期間（開始日・終了日）・対応期限の入力欄を追加。対応期限欄は`actionRequired`が偽のとき無効化し、偽に変更された時点で値をクリアする
- `src/components/features/helpdesk-announcements/AnnouncementManagementListClient.tsx` — 各行に公開期間（設定時のみ）・対応期限（`actionRequired`が真の場合のみ）を表示
- `messages/ja.json` / `messages/en.json` — 上記フィールドのラベル・バリデーションメッセージの翻訳キー追加

### Requirements Traceability（追加分）

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 15.1〜15.5 | 公開期間の設定 | AnnouncementForm, Announcement型 | State | — |
| 16.1〜16.4 | 公開期間による表示制御 | AnnouncementsMockApi（拡張）, AnnouncementManagementListClient | Service | — |
| 17.1〜17.6 | 対応期限の設定 | AnnouncementForm, announcementFormSchema, AnnouncementManagementListClient | State | — |

### Components and Interfaces（追加分）

#### AnnouncementsMockApiExtension（差分）

**Responsibilities & Constraints（追加）**
- `isVisibleToCurrentCompany`相当の判定に加え、`isWithinPublishPeriod(announcement, referenceDate)`を導入し、`publishStartDate`/`publishEndDate`がいずれも未設定なら常に`true`、設定されている場合は`referenceDate`（呼び出し時点の現在日時）がその範囲内かどうかで判定する
- `getAllAnnouncements`/`getAnnouncementByIdForHelpdesk`（ヘルプデスク側）は公開期間による絞り込みを行わない（要件16.3）

```typescript
function isWithinPublishPeriod(announcement: Announcement, referenceDate: Date): boolean {
  const start = announcement.publishStartDate ? new Date(announcement.publishStartDate) : null;
  const end = announcement.publishEndDate ? new Date(announcement.publishEndDate) : null;
  if (start && referenceDate < start) return false;
  if (end && referenceDate > end) return false;
  return true;
}
```
- Preconditions: `referenceDate`は呼び出し時点の`new Date()`
- Postconditions: `getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`は`isVisibleToCurrentCompany(a) && isWithinPublishPeriod(a, new Date())`を満たすお知らせのみ返す
- Invariants: 公開期間が両方`null`のお知らせは常に`isWithinPublishPeriod`が`true`

#### AnnouncementForm（差分）

**Responsibilities & Constraints（追加）**
- 公開期間の開始日・終了日入力欄（`<input type="date">`、任意入力）を追加する
- 対応期限入力欄（`<input type="date">`）を追加し、`actionRequired`フィールドの値を`watch`して、真のときのみ活性化・必須表示（`requiredIndicator`）にする
- `actionRequired`が偽に変更されたとき、`setValue("dueDate", "")`で対応期限をクリアする（要件17.5）

#### AnnouncementManagementListClient（差分）

**Responsibilities & Constraints（追加）**
- 各行のメタ情報表示に、公開期間が設定されている場合は`「公開期間: {開始日} 〜 {終了日}」`（片方のみ設定時は該当側のみ）を、未設定の場合は表示を省略する
- `actionRequired`が真の行にのみ、対応期限（`dueDate`）をラベル付きで表示する

### Data Models（追加分）

- `Announcement`（既存、拡張）: `publishStartDate: string | null`, `publishEndDate: string | null`, `dueDate: string | null`を追加（いずれもISO日付文字列 `YYYY-MM-DD`、初期値は`null`）
- `CreateAnnouncementInput`は`Announcement`から`id`・`publishedAt`を除いたサブセットのため自動的に3フィールドを含む

### Testing Strategy（追加分）

- **Unit Tests**:
  - `announcementFormSchema`が、終了日が開始日より前のとき`publishEndDate`にエラーを付与すること
  - `announcementFormSchema`が、`actionRequired: true`かつ`dueDate`未入力のとき`dueDate`にエラーを付与すること
  - `announcementFormSchema`が、`actionRequired: false`のときは`dueDate`未入力を許容すること
  - `isWithinPublishPeriod`相当のロジックが、開始前・終了後・期間内・未設定の4パターンを正しく判定すること
  - `getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`が公開期間外のお知らせを除外すること
  - `getAllAnnouncements`/`getAnnouncementByIdForHelpdesk`が公開期間に関わらず全件を返すこと
  - `updateAnnouncement`が`actionRequired`・`dueDate`・公開期間を含め、渡された全フィールドを更新すること
- **Integration Tests**:
  - 対応要否を「対応が必要」にした状態で対応期限未入力のまま保存しようとすると、保存がブロックされること
  - 対応要否を「対応が必要」から「対応不要」に変更すると、対応期限欄がクリア・無効化されること
- **E2E/UI Tests**:
  - 公開期間・対応期限の入力欄が日本語・英語で表示されること

---

## 追加ラウンド（2026-07-10）: 下書き機能の追加

### Overview（追加分）
`Announcement`に公開状態（`status`: `draft` | `published`）を追加し、内容を検討中のお知らせを海外販社側から完全に隠す下書き機能を実装する。**Purpose**: ヘルプデスク担当者が誤って未完成の周知事項を公開してしまうことを防ぎ、内容を練ってから明示的に公開する運用フローを可能にする。**Impact**: `Announcement`型・`announcementFormSchema`・`AnnouncementForm`・`AnnouncementManagementListClient`・`AnnouncementFilterBar`・`lib/helpdesk-announcement-list.ts`を変更する。新規コンポーネントの追加はない。

> **前提の変更点**: 本ラウンド以前の設計は`globalThis`共有モックストア（`getGlobalMockStore`）を前提に記述されているが、`backend-db-foundation`specにより実装はPrisma + PostgreSQLへ移行済みである（`prisma/schema.prisma`の`Announcement`モデル、`src/lib/server/announcement-service.ts`、`src/lib/api/announcements.ts`の`requireHelpdeskStaffSession()`/`requireApplicantSession()`ガード）。本ラウンドはこの現行のDBベース実装を対象に設計する。過去ラウンドの記述（モックストア）は当時の設計判断の記録として変更しない。

### Goals（追加分）
- お知らせごとに公開状態（下書き/公開）を設定でき、新規作成時は下書きが既定値である
- 下書き状態のお知らせは、配信対象・公開期間の条件を満たしていても海外販社側に一切表示されない
- 公開状態は編集フォームのセレクトで自由に切り替えられる（公開→下書きへの差し戻しも同じ操作で行える）
- 実際に公開された日時（`publishedAt`）が、下書き→公開へ遷移した瞬間を正しく反映する

### Non-Goals（追加分）
- 公開日時を指定した予約公開（自動的に下書きから公開へ切り替える機能）
- 公開状態の変更履歴の記録
- 下書き専用のプレビュー画面

### Boundary Commitments（追加分）

**This Spec Owns（追加）**
- `Announcement.status`（`AnnouncementStatus`: `draft` | `published`）フィールドの追加・マイグレーション
- `Announcement.publishedAt`のnullable化と、下書き→公開遷移時の打刻ロジック
- `Announcement.createdAt`/`updatedAt`の追加（ヘルプデスク側一覧のソートキーとして新設）
- お知らせ作成・編集フォームでの公開状態セレクト
- お知らせ管理一覧の下書きバッジ表示・公開状態による絞り込み
- 下書き状態のお知らせに対するリマインド送信・確認済み人数表示の抑止

**Out of Boundary（追加）**
- 申請者側（`announcements`spec）の一覧・詳細・ダッシュボードウィジェットにおける下書き除外の表示ロジック自体（本specは`status`フィールドと、それを反映した読み取り関数の絞り込みを提供する。`announcements`spec側は要件14として本フィールドを参照するのみで、UIコンポーネント自体の変更はない）

**Allowed Dependencies（追加）**: 変更なし（既存の`prisma`クライアント・`announcementFormSchema`・`AnnouncementForm`の拡張のみ）

**Revalidation Triggers（追加）**
- `Announcement.status`/`publishedAt`（nullable化）の型・意味の変更（`announcements`specが再確認する必要がある）

### Architecture（追加分）
新規コンポーネント・新規フローは発生しない。既存の可視性フィルタ（`visibleToCountryWhere` + `isWithinPublishPeriod`、`src/lib/server/announcement-service.ts`）に`status: "published"`のAND条件を追加し、既存の`AnnouncementForm`・`AnnouncementManagementListClient`・`AnnouncementFilterBar`にフィールドを追加する形で対応する。

**Architecture Integration（追加分）**:
- 既存パターン踏襲: 可視性判定は`listAnnouncementsVisibleToCountry`/`findAnnouncementVisibleToCountry`の`where`条件に`status: "published"`を追加する形で拡張し、`isWithinPublishPeriod`によるフィルタとは独立したAND条件として合成する。申請者側の関数シグネチャ（引数・戻り値の型）は変更しない
- `updateAnnouncementRecord`は、更新前のレコードを取得して現在の`status`を確認し、「`draft` → `published`」への遷移時のみ`publishedAt`を現在時刻で上書きする（それ以外は`publishedAt`を変更しない）
- 新規コンポーネントを作らない理由: 入力欄1つ（セレクト）・表示バッジ1つ・絞り込み条件1つの追加のみであり、既存コンポーネントの責務範囲に収まるため

### Technology Stack（追加分・差分のみ）
追加・変更なし（既存の`react-hook-form` + `zod`、Prisma、既存の`Select`/`Badge`UIプリミティブのみを使用）。

### File Structure Plan（追加分）
新規ファイルなし。以下を変更する。

### Modified Files（追加分）
- `prisma/schema.prisma` — `Announcement`に`status AnnouncementStatus @default(published)`、`AnnouncementStatus`列挙型（`draft`/`published`）、`createdAt DateTime @default(now())`、`updatedAt DateTime @updatedAt`を追加。`publishedAt`を`DateTime?`（nullable）に変更
- `prisma/migrations/` — 上記スキーマ変更を反映する新規マイグレーション（既存行は`status: published`として後方互換を維持）
- `src/types/announcement.ts` — `AnnouncementStatus`型（`"draft" | "published"`）、`Announcement.status`、`Announcement.createdAt`/`updatedAt: string`を追加。`publishedAt: string`を`publishedAt: string | null`に変更
- `src/lib/validation/announcement.ts` — `announcementFormSchema`に`status: z.enum(["draft", "published"])`を追加（既定値は`AnnouncementForm`側でハンドルする新規作成時の初期表示値として扱う）
- `src/lib/server/announcement-service.ts` — `visibleToCountryWhere`に`status: "published"`のAND条件を追加、`ORDER_BY_PUBLISHED_AT_DESC`はヘルプデスク側一覧（`listAllAnnouncements`）専用に`createdAt desc`へ切り替え、`updateAnnouncementRecord`に「`draft`→`published`遷移時のみ`publishedAt`を打刻」ロジックを追加、`createAnnouncementRecord`は`status`に応じて`publishedAt`を`now()`または`null`で保存
- `src/components/features/helpdesk-announcements/AnnouncementForm.tsx` — 公開状態（下書き/公開）の`Select`フィールドを追加。新規作成時の初期値は`"draft"`
- `src/components/features/helpdesk-announcements/AnnouncementManagementListClient.tsx` — 各行に下書きバッジ（`status === "draft"`のときのみ）を表示。`publishedAt`が`null`の行は公開日表示をフォールバック（例: `—`）にする
- `src/components/features/helpdesk-announcements/AnnouncementFilterBar.tsx` — 公開状態（すべて/下書き/公開）の`Select`を追加
- `src/lib/helpdesk-announcement-list.ts` — `HelpdeskAnnouncementFilters`に`status: "" | "draft" | "published"`を追加し、`filterAnnouncementsForHelpdesk`でAND条件として絞り込む
- `src/components/features/helpdesk-announcements/AnnouncementTrackingBadge.tsx` / `AnnouncementRecipientDialog.tsx` — `status === "draft"`のお知らせについては人数表示・リマインド送信操作を提供しない（非表示または無効化）
- `messages/ja.json` / `messages/en.json` — `helpdeskAnnouncements.form.status*`、`helpdeskAnnouncements.list.statusBadgeDraft`、`helpdeskAnnouncements.list.filter.status*`の翻訳キー追加

### Requirements Traceability（追加分）

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 18.1〜18.5 | 公開状態フィールドの追加 | AnnouncementForm, Announcement型, announcement-service | State/Service | — |
| 19.1〜19.5 | 公開日時の記録タイミング | announcement-service（createAnnouncementRecord/updateAnnouncementRecord） | Service | — |
| 20.1〜20.4 | 下書きの可視性制御 | announcement-service（visibleToCountryWhere） | Service | — |
| 21.1〜21.3 | 管理一覧での公開状態の表示・絞り込み | AnnouncementManagementListClient, AnnouncementFilterBar, filterAnnouncementsForHelpdesk | State | — |
| 22.1 | 下書き状態でのリマインド送信の抑止 | AnnouncementTrackingBadge, AnnouncementRecipientDialog | State | — |

### Components and Interfaces（追加分）

#### announcement-service（差分）

**Responsibilities & Constraints（追加）**
- `visibleToCountryWhere`の戻り値に`status: "published"`をトップレベルのAND条件として合成する（`isWithinPublishPeriod`のフィルタとは独立して適用する）
- `updateAnnouncementRecord`は更新対象の現在の`status`を`findAnnouncementById`相当で取得し、`previousStatus !== "published" && input.status === "published"`のときのみ`publishedAt: new Date()`をセットする。それ以外は`publishedAt`をデータに含めない（既存値を保持）
- `createAnnouncementRecord`は`input.status === "published"`のとき`publishedAt: new Date()`、`"draft"`のとき`publishedAt: null`を保存する
- `listAllAnnouncements`（ヘルプデスク側）は`orderBy: { createdAt: "desc" }`に変更する（下書きは`publishedAt`が`null`になり得るため）

```typescript
function visibleToCountryWhere(country: string): Prisma.AnnouncementWhereInput {
  return {
    status: "published",
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
    ],
  };
}
```
- Preconditions: `country`は自社の国コード
- Postconditions: `listAnnouncementsVisibleToCountry`/`findAnnouncementVisibleToCountry`は`status === "published"`かつ配信対象条件かつ公開期間内のお知らせのみを返す
- Invariants: `status === "draft"`のお知らせは申請者側のいかなる読み取り関数からも返されない

#### AnnouncementForm（差分）

**Responsibilities & Constraints（追加）**
- 公開状態（下書き/公開）の`Select`フィールドを追加する。新規作成時の初期値は`"draft"`、編集時は既存レコードの`status`を初期表示する
- 保存ボタンは既存の1つのままとし、選択した`status`の値でそのまま送信する（下書き保存・公開の専用ボタンは設けない）

#### AnnouncementManagementListClient / AnnouncementFilterBar（差分）

**Responsibilities & Constraints（追加）**
- 各行について、`status === "draft"`のときのみ下書きバッジ（`Badge variant="secondary"`）を表示する
- `publishedAt`が`null`の行では、公開日表示を`—`等のプレースホルダーに置き換える（例外を発生させない）
- `AnnouncementFilterBar`に公開状態（すべて/下書き/公開）の`Select`を追加し、`filterAnnouncementsForHelpdesk`が`status`を含むAND条件で絞り込む

### Data Models（追加分）

- `Announcement`（既存、拡張）: `status: "draft" | "published"`を追加（新規作成時の既定値は`"draft"`）。`publishedAt: string | null`に変更（下書き中は`null`）。`createdAt: string`、`updatedAt: string`を追加
- `CreateAnnouncementInput`は`Announcement`から`id`・`publishedAt`・`createdAt`・`updatedAt`を除いたサブセットのため、`status`は自動的に含まれる（型定義の追加変更は`Omit`対象の見直しのみ）

### Error Handling（追加分）
既存パターンを維持する。公開状態の値は`zod`の`z.enum(["draft", "published"])`により型レベルで不正値を排除するため、追加のエラーハンドリングは発生しない。

### Testing Strategy（追加分）

- **Unit Tests**:
  - `createAnnouncementRecord`が`status: "draft"`のとき`publishedAt: null`を、`status: "published"`のとき`publishedAt`に現在時刻相当の値を保存すること
  - `updateAnnouncementRecord`が「`draft`→`published`」遷移時のみ`publishedAt`を更新し、「`published`→`published`」「`published`→`draft`」では既存の`publishedAt`を変更しないこと
  - `listAnnouncementsVisibleToCountry`/`findAnnouncementVisibleToCountry`が`status === "draft"`のお知らせを、配信対象・公開期間の条件を満たしていても除外すること
  - `listAllAnnouncements`（ヘルプデスク側）が`status`に関わらず全件を`createdAt`降順で返すこと
  - `filterAnnouncementsForHelpdesk`が`status`によるAND条件の絞り込みに対応すること
  - `announcementFormSchema`が`status`を`"draft" | "published"`のいずれかとして要求すること
- **Integration Tests**:
  - 下書きとして新規作成したお知らせが、申請者側の一覧・詳細・ダッシュボードウィジェットのいずれにも表示されないこと
  - 編集で公開状態を「公開」に変更して保存すると、申請者側に表示され、`publishedAt`が保存操作時刻に更新されること
  - 公開済みのお知らせを「下書き」に差し戻すと、即座に申請者側の表示から除外されること（確認済み・実施済み状態のモックデータは削除されない）
  - 下書き状態のお知らせについて、確認済み人数表示・リマインド送信操作が提供されない、または操作不可であること
- **E2E/UI Tests**:
  - 日本語・英語両方で公開状態セレクト・下書きバッジ・絞り込みラベルが翻訳されること
  - タブレット幅（768px）でフォーム・一覧が横スクロールを発生させないこと
