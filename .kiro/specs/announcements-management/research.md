# Research & Design Decisions

## Summary
- **Feature**: `announcements-management`
- **Discovery Scope**: Extension（既存`announcements`spec・`helpdesk-inquiry-management`specの拡張）
- **Key Findings**:
  - `MOCK_CURRENT_COMPANY`（自社スコープの基準となる固定のモック会社・国）は`lib/api/inquiries.ts`内に非公開で定義されており、他モジュールから再利用できない。お知らせの配信対象フィルタでも同じ「自社の国」を基準にする必要があるため、共有定数として切り出す必要がある。
  - `helpdesk-inquiry-management`specで確立した「Server Actions + `getGlobalMockStore`による`globalThis`共有ストア + サーバー側zodバリデーション」パターンは、Next.js dev環境でモジュールインスタンスが分離される問題を回避する実証済みの方式であり、本specの変更系操作（作成・編集・削除）でもそのまま踏襲する。
  - 既存のUIプリミティブ（`src/components/ui/`）にはダイアログ・モーダルコンポーネントが存在しない。削除確認（要件4.3）は新規UIコンポーネントを追加せず、ブラウザ標準の`confirm()`で最小限に実現する。

## Research Log

### 配信対象フィルタの基準となる「自社の国」の共有方法
- **Context**: 申請者側の問い合わせ一覧は`helpdesk-portal-layout`specで導入した固定のモック会社（`MOCK_CURRENT_COMPANY`、国コード`VN`）でスコープされている。お知らせの配信対象フィルタも同じ基準を使うことが要件（6.1）で定められている。
- **Sources Consulted**: `src/lib/api/inquiries.ts`（`MOCK_CURRENT_COMPANY`の定義箇所を確認）。
- **Findings**: `MOCK_CURRENT_COMPANY`は`inquiries.ts`内のモジュール非公開定数であり、`announcements.ts`から直接importできない。
- **Implications**: `src/lib/constants/current-company.ts`を新設して`MOCK_CURRENT_COMPANY`をそこに移動し、`inquiries.ts`・`announcements.ts`の両方から参照する。既存の`inquiries.ts`の挙動は変更しない（定数の置き場所を変えるのみ）。

### お知らせの配信対象データ設計
- **Context**: 「全体一律」か「特定の国・地域を1つ以上指定」かを表現するデータ構造を検討した。
- **Sources Consulted**: `src/types/announcement.ts`（既存`Announcement`型）、`helpdesk-inquiry-management`specの`ReplyTemplate`型設計（同specでの型拡張パターン）。
- **Findings**: 単純な`targetCountries?: string[]`（未指定・空配列＝全体一律）という設計は、「特定の国を指定のつもりが0件選択のまま保存された」状態と「全体一律」の状態が型上区別できず、要件5.3のバリデーションを型レベルで表現できない。
- **Implications**: `scope: "all" | "countries"`の判別可能なユニオン型（`AnnouncementTargeting`）を採用し、`scope: "countries"`のときのみ`countries: string[]`（1件以上）を持たせる。既存の5件のシードデータには後方互換のため`{ scope: "all" }`を付与し、追加前と同じ可視性を維持する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. 判別可能なユニオン型で配信対象を表現（採用） | `{scope: "all"} \| {scope: "countries", countries: string[]}` | 「指定したのに0件」という不正状態を型で表現しづらくできる、zodの`discriminatedUnion`と自然に対応 | 既存データへのマイグレーション（`{scope: "all"}`付与）が必要 | `helpdesk-inquiry-management`のReplyTemplate型設計と同様の考え方 |
| B. `targetCountries?: string[]`のみで表現 | 空配列・undefinedを「全体一律」とみなす | シンプル | 「指定意図はあるが0件」の不正状態を型で防げず、要件5.3のバリデーションがUIの実装依存になる | 却下 |

## Design Decisions

### Decision: 配信対象は判別可能なユニオン型で表現する
- **Context**: 要件5.1〜5.3（全体一律 or 特定の国・地域を1件以上指定、0件選択時のブロック）を型安全に表現する
- **Alternatives Considered**: 1. 判別可能なユニオン型（Option A） 2. optionalな配列のみ（Option B）
- **Selected Approach**: Option A
- **Rationale**: 不正状態（指定意図があるのに0件）を型定義段階で排除でき、zodスキーマとも自然に対応する
- **Trade-offs**: 既存シードデータへの`{scope: "all"}`付与というマイグレーション作業が必要になるが、既存の可視性を変えないため実害はない
- **Follow-up**: なし

### Decision: 自社の国の判定基準を共有定数として切り出す
- **Context**: 問い合わせのスコープとお知らせの配信対象フィルタが同じ「自社の国」を参照する必要がある
- **Alternatives Considered**: 1. `announcements.ts`に別途同じ値を再定義する 2. 共有定数ファイルに切り出す（Option A）
- **Selected Approach**: 2
- **Rationale**: 値の二重管理を避け、将来的に認証機能に置き換わる際の変更箇所を一箇所に集約する
- **Trade-offs**: `inquiries.ts`の既存定義を移動する軽微な変更が発生するが、挙動は変わらない
- **Follow-up**: フェーズ3で認証済みユーザーの所属会社情報に置き換える際、この共有定数を置き換えるだけで済むようにする

### Decision: 削除確認はブラウザ標準の`confirm()`で実現する
- **Context**: 要件4.3（削除前の確認）をどう実現するか
- **Alternatives Considered**: 1. 新規ダイアログコンポーネントを追加する 2. ブラウザ標準の`confirm()`を使う（Option A）
- **Selected Approach**: 2
- **Rationale**: 既存のUIプリミティブにダイアログが存在せず、フェーズ1のモックの規模で新規コンポーネントを追加するコストに見合わない
- **Trade-offs**: ブラウザ標準ダイアログは見た目のカスタマイズができないが、機能要件は満たす
- **Follow-up**: 将来的にデザインシステムにダイアログコンポーネントが追加された場合は置き換えを検討する

## Risks & Mitigations
- 既存お知らせデータへの`targeting`フィールド追加漏れがあると、その1件だけ既存の可視性が変わってしまう — シードデータ全件に`{scope: "all"}`を明示的に付与し、単体テストで既存5件全てが引き続き申請者側に表示されることを確認する
- `getAnnouncementById`を自社スコープに変更すると、既存の申請者側テストが影響を受ける可能性がある — 既存テストのシードデータ想定を確認し、必要に応じてテストを更新する
- Server Actionsのサーバー側バリデーション漏れ（`helpdesk-inquiry-management`で指摘されたHigh指摘と同種の問題）を再発させない — 全ての変更系アクションでzodスキーマによる検証を必須とする

## References
- 既存実装: `src/lib/api/inquiries.ts`, `src/types/announcement.ts`, `src/lib/actions/helpdesk.ts`, `.kiro/specs/helpdesk-inquiry-management/design.md`

---

## 追加ラウンド（2026-07-07）: タイトル・種別・対応要否による検索、対応要否フィールドの追加

### Summary（追加分）
- **Discovery Scope**: Extension（既存の実装済み機能への追加）
- **Key Findings**:
  - `helpdesk-inquiry-management`specが確立した「サーバー側で全件取得 → クライアントコンポーネントでフィルタ状態を保持しリアルタイムに絞り込む」パターン（`HelpdeskInquiryListClient` + `HelpdeskInquiryFilterBar` + `lib/helpdesk-inquiry-list.ts`）がそのまま転用できる
  - UIキット（`src/components/ui/`）にはCheckbox/Switchコンポーネントが存在しない。真偽値の入力は既存の`targeting.scope`と同様に`Select`（2択）で表現するのが既存パターンとの一貫性が高い
  - `Announcement`型・バリデーションスキーマ・作成/更新API関数はいずれも本spec所有（`targeting`フィールド追加時の実績）のため、`actionRequired`フィールドの追加も本spec側で完結できる

### Research Log（追加分）

#### 既存フィルタパターンの確認（`helpdesk-inquiry-management`）
- **Context**: お知らせ管理一覧に検索・絞り込みを追加するにあたり、既存のヘルプデスク側一覧（問い合わせ管理）にある実装パターンを踏襲する方針が要件11.5で明記されている
- **Sources Consulted**: `src/components/features/helpdesk-inquiries/HelpdeskInquiryFilterBar.tsx`、`HelpdeskInquiryListClient.tsx`、`src/lib/helpdesk-inquiry-list.ts`
- **Findings**:
  - サーバーコンポーネントが`getAllAnnouncements()`相当で全件取得し、クライアントコンポーネント（`"use client"`）に渡す
  - クライアントコンポーネントは`useState`でフィルタ条件を保持し、`useMemo`でフィルタ済み配列を算出。フィルタ関数は純粋関数として`lib/`配下に切り出されている
  - フィルタバーは`onChange`で親に差分オブジェクトを通知するだけで状態自体は持たない（Controlled）。「クリア」ボタンで空のフィルタ状態に戻す
  - URLクエリパラメータは使用しない（ページ再読み込み・ブックマーク共有は対象外）
- **Implications**: お知らせ管理一覧も同一パターンで実装する。新規ファイル`src/lib/helpdesk-announcement-list.ts`（フィルタ型・フィルタ関数）、`AnnouncementFilterBar.tsx`、`AnnouncementManagementListClient.tsx`を追加し、既存`AnnouncementManagementList.tsx`はデータ取得のみを担うサーバーコンポーネントに整理する

#### 対応要否の入力UI
- **Context**: `Announcement`に真偽値フィールド`actionRequired`を追加し、作成・編集フォームで設定できるようにする必要がある
- **Sources Consulted**: `src/components/ui/`配下のコンポーネント一覧、既存フォーム（`AnnouncementForm.tsx`の`targeting.scope`実装）
- **Findings**: Checkbox/Switchに相当する汎用UIコンポーネントは未実装。一方、`targeting.scope`（`"all" | "countries"`という2値分岐）は既存の`Select`コンポーネントで表現されている
- **Implications**: 新規UIプリミティブ（Checkbox等）を追加せず、`actionRequired`も`Select`（「対応が必要」「対応不要」の2択）で表現する

#### バッジ表現の確認
- **Context**: 対応要否「要対応」を一覧上でどう視覚的に強調するか
- **Sources Consulted**: `src/components/ui/badge.tsx`、`HelpdeskInquiryListItem.tsx`の「対応中」バッジ実装
- **Findings**: 「対応中」バッジは`Badge variant="default"`（DAISOピンク塗り）を使い、条件を満たす場合のみ表示・満たさない場合は要素ごと非表示にする実装になっている
- **Implications**: 「対応が必要」バッジも同じ`variant="default"`を再利用し、新規バリアント追加は行わない

### Architecture Pattern Evaluation（追加分）

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. クライアント側リアルタイムフィルタ（採用） | 全件をサーバーで取得し、クライアントコンポーネントで絞り込む | 既存パターンと完全に一致、実装コストが低い、ページ遷移なしで即時反映 | データ件数が将来大きく増えるとクライアント転送量が増える（フェーズ1のモック規模では問題なし） | `helpdesk-inquiry-management`spec実績あり |
| B. URLクエリパラメータ＋サーバーフィルタ | フィルタ条件をURLに保持しサーバー側で絞り込む | ブックマーク・共有が可能 | 既存の問い合わせ管理一覧と実装方針が異なり一貫性を損なう、フェーズ1要件にはオーバースペック | 不採用 |

### Design Decisions（追加分）

#### Decision: 対応要否フィールドの入力方式
- **Context**: `actionRequired`（真偽値）をフォームでどう入力させるか
- **Alternatives Considered**: 1. 新規Checkbox/Switchコンポーネントを追加する 2. 既存の`Select`コンポーネントで2択として表現する
- **Selected Approach**: 2
- **Rationale**: 既存の`targeting.scope`と同じ表現方法にすることで実装・レビューコストを抑え、UIキットへの新規プリミティブ追加という本spec範囲外の変更を避ける
- **Trade-offs**: チェックボックスに比べると一手間多い操作になるが、フェーズ1のモックアップとしては許容範囲
- **Follow-up**: 将来Checkbox/Switchが他specで追加された場合、置き換えを検討してもよい

#### Decision: フィルタ状態の保持方法
- **Context**: タイトル・種別・対応要否のフィルタ状態をどこで保持するか
- **Alternatives Considered**: 1. `helpdesk-inquiry-management`と同じ、クライアントコンポーネントの`useState`（Option A） 2. URLクエリパラメータ（Option B）
- **Selected Approach**: Option A
- **Rationale**: 要件11.5が既存パターンの踏襲を明記している。一覧規模もモック数件〜数十件想定でパフォーマンス上の懸念がない
- **Trade-offs**: リロードでフィルタ状態が失われるが、既存の問い合わせ管理一覧と同じ挙動のため許容
- **Follow-up**: なし

### Risks & Mitigations（追加分）
- `Announcement`型への`actionRequired`追加により、型を参照する`announcements`spec側の表示コードが未対応のままだとビルドエラーになる — `actionRequired`を必須フィールドとして追加し、モックデータ全件に値を設定した上で、`announcements`spec側の対応も同一タイミングで完了させる
- 既存の`AnnouncementManagementList`をサーバー/クライアントに分割する際、既存のローディング・エラー・空状態のUIを壊す — 既存のCard/Skeleton構造をそのままサーバーコンポーネント側に残し、フィルタ機能のみクライアント側に切り出す

### References（追加分）
- `src/components/features/helpdesk-inquiries/HelpdeskInquiryFilterBar.tsx` — フィルタバーの実装パターン
- `src/components/features/helpdesk-inquiries/HelpdeskInquiryListClient.tsx` — クライアント側フィルタ結線パターン
- `src/lib/helpdesk-inquiry-list.ts` — フィルタ型・フィルタ関数のパターン
