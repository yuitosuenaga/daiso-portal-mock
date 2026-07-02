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
