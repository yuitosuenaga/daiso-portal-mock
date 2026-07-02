# Research & Design Decisions

## Summary
- **Feature**: `dashboard-card-redesign`
- **Discovery Scope**: Extension（既存Next.jsモックアップの一部画面・ナビゲーション構成の再設計）
- **Key Findings**:
  - 両ポータルのトップページは既存の shadcn/ui `Card` コンポーネントと next-intl のみで構築可能であり、新規外部ライブラリの追加は不要
  - `src/lib/api/links.ts` / `faqs.ts` は認証・会社スコープを持たない共通データ関数のため、ヘルプデスク側ページからもそのまま再利用できる
  - 申請者側ダッシュボードの既存5ウィジェット（`AnnouncementWidget`等）はダッシュボードページ以外から参照されておらず、カード形式への置き換えに伴い削除対象となる
  - `announcements-management` spec（別ブランチ、2026-07-02時点で `tasks-approved`）は `/[locale]/helpdesk/announcements` ルートと `HelpdeskSidebar.tsx` へのナビ項目追加を含んでおり、本specとファイル競合の可能性がある

## Research Log

### 既存ダッシュボードウィジェットの利用箇所
- **Context**: カード形式への刷新に伴い、既存の5ウィジェット（`AnnouncementWidget`, `InquiryStatusWidget`, `RecentInquiriesWidget`, `QuickLinksWidget`, `FaqPickWidget`）を継続利用するか削除するか判断が必要だった
- **Sources Consulted**: `grep -rl` によるコードベース全体の参照箇所調査
- **Findings**: いずれも `src/app/[locale]/(applicant)/page.tsx` からのみ参照されており、他画面からの利用はない
- **Implications**: ダッシュボードページの置き換えに伴い、5ウィジェットおよび対応するテストファイルは削除する（未使用コードを残さない）

### ヘルプデスク側「リンク」「FAQ」ページの実装方式
- **Context**: 申請者側と同一データを参照する新規ページをどう実装するかの検討
- **Sources Consulted**: `src/lib/api/links.ts`, `src/lib/api/faqs.ts`, `src/components/features/links/LinkList.tsx`, `src/components/features/faq/FaqList.tsx`
- **Findings**: `getLinks()` / `getFaqs()` は会社・ロールによる絞り込みを行わない共通関数。`LinkList` / `FaqList` コンポーネントもポータル固有のルーティング前提（ハードコードされた申請者側パス等）を持たない
- **Implications**: ヘルプデスク側ページは既存コンポーネントをそのまま再利用する薄い `page.tsx` ラッパーとして実装できる。データ層・表示コンポーネントの複製は不要

### 「新着」バッジ表示の実現可能性
- **Context**: 要件1.5・2.7で「新着のお知らせ」「未対応の問い合わせ件数」等をカードにバッジ表示する定めがあるが、フェーズ1は認証未実装のため個人単位の既読/未読状態を持てない
- **Sources Consulted**: `.kiro/steering/product.md`（フェーズ方針）, `src/types/announcement.ts`, `src/lib/api/inquiries.ts`
- **Findings**: 個人の既読管理は不可能。一方で問い合わせは `status`（new/in_progress/resolved）を持ち、お知らせは `publishedAt` を持つため、状態やタイムスタンプを起点にした代替指標は算出可能
- **Implications**: 「未読」ではなく以下の代替指標を採用する（Design Decisions参照）:
  - 問い合わせ系カード: ステータスが `new` または `in_progress` の件数（＝未対応件数）
  - お知らせカード: `publishedAt` が直近7日以内の件数（＝新着件数）

### ヘルプデスク側の問い合わせ集計関数
- **Context**: 申請者側は `getInquiryStatusSummary()`（自社分）が既に存在するが、ヘルプデスク側（全社分）の集計関数は存在しない
- **Sources Consulted**: `src/lib/api/inquiries.ts`
- **Findings**: `getInquiryStatusSummary()` は内部で `getInquiries()`（自社フィルタ済み）を呼び出して集計している。ヘルプデスク側向けに `getAllInquiries()`（全社・フィルタなし）を起点に同じ集計を行う関数を追加すれば、既存パターンをそのまま踏襲できる
- **Implications**: `getAllInquiryStatusSummary(): Promise<InquiryStatusSummary>` を新規追加する。既存の `InquiryStatusSummary` 型をそのまま再利用する

### `announcements-management` spec との競合範囲
- **Context**: ユーザー指示により、ヘルプデスク側トップページに「お知らせ管理」カードを追加する必要がある
- **Sources Consulted**: `.kiro/specs/announcements-management/spec.json`, `design.md`
- **Findings**: 当該specは `tasks-approved` まで進行済み。実装対象ルートは `/[locale]/helpdesk/announcements`（一覧・作成・編集）で確定している。また同specは `HelpdeskSidebar.tsx` に「お知らせ管理」ナビ項目を追加するタスクを持つ
- **Implications**: 本specは `/[locale]/helpdesk/announcements` への導線カードのみを実装し、当該ルートの内部実装には関与しない。`HelpdeskSidebar.tsx` は両specが変更するため、実装順序またはマージ順の調整が必要（タスクフェーズで明記）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| カード単位の個別Suspense（採用） | 既存ウィジェットと同様、バッジデータを要するカードごとに独立した非同期Serverコンポーネント＋Suspense境界を持つ | 既存パターンを踏襲、1カードのデータ取得失敗が他カードに波及しない（要件1.6/2.9を満たす） | コンポーネント数がやや増える | 既存 `AnnouncementWidget` 等の設計を継承 |
| ページ単位で一括データ取得 | `page.tsx` で `Promise.all` により全カードのデータを取得してから描画 | 実装がシンプル | 1つのデータ取得失敗がページ全体のエラー表示に波及しやすく、要件1.6/2.9のカード単位のエラー分離を満たしにくい | 不採用 |

## Design Decisions

### Decision: バッジの代替指標
- **Context**: 要件の「新着情報」「未読」表現をフェーズ1（認証なし）の制約下でどう実現するか
- **Alternatives Considered**:
  1. バッジ表示自体を見送る
  2. 状態・タイムスタンプベースの代替指標を採用
- **Selected Approach**: 問い合わせ系カードは「未対応件数」（`new` + `in_progress` の合計）、お知らせカードは「直近7日以内の公開件数」をバッジに表示する
- **Rationale**: 要件が求める「一目で状況把握」という目的を、認証なしでも実現可能な既存データから満たせる
- **Trade-offs**: 個人ごとの厳密な未読管理ではないが、フェーズ1のモックアップとしては十分な近似情報になる
- **Follow-up**: フェーズ3（認証実装後）に真の既読管理へ置き換える可能性がある旨をコード上に記録する

### Decision: 既存ダッシュボードウィジェットの削除
- **Context**: カード形式への刷新により、既存5ウィジェットがダッシュボード上で使われなくなる
- **Alternatives Considered**:
  1. ウィジェットを残し、将来の再利用に備える
  2. 未使用コードとして削除する
- **Selected Approach**: 削除する（`AnnouncementWidget`, `InquiryStatusWidget`, `RecentInquiriesWidget`, `QuickLinksWidget`, `FaqPickWidget` とそれぞれのテスト）
- **Rationale**: 他画面からの参照がなく、使われない抽象化を残さないプロジェクト方針に合致する。カードのバッジ集計ロジック（`getInquiryStatusSummary` 等）はAPI層の関数として引き続き再利用する
- **Trade-offs**: 将来「問い合わせ状況の詳細な内訳」を再びダッシュボードに表示したくなった場合は再実装が必要
- **Follow-up**: なし

### Decision: ヘルプデスク側「問い合わせ一覧」集計ロジックの共通化
- **Context**: 申請者側（自社）・ヘルプデスク側（全社）で同種の集計ロジックが必要
- **Alternatives Considered**:
  1. ヘルプデスク側専用の集計関数を新規に一から実装
  2. 既存 `getInquiryStatusSummary()` と対になる `getAllInquiryStatusSummary()` を追加し、UIコンポーネント（`InquiryListCard`）を `scope` propで共通化
- **Selected Approach**: 2を採用
- **Rationale**: 既存パターン踏襲によりレビューコストと重複コードを削減できる
- **Trade-offs**: なし
- **Follow-up**: なし

## Risks & Mitigations
- `announcements-management` spec とのマージ順によっては `HelpdeskSidebar.tsx` および「お知らせ管理」カードのリンク先が一時的に不整合になる — タスクフェーズでマージ順を明記し、実装前に相手ブランチの状況を確認する
- お知らせの「新着7日」しきい値はハードコードの仮値であり、実運用の要望と乖離する可能性がある — ヒアリング後（フェーズ2）に調整可能な設計とする

## References
- `.kiro/specs/announcements-management/design.md` — ヘルプデスク側お知らせ管理のルート・ナビゲーション変更範囲の確認
- `.kiro/steering/product.md` — フェーズ方針（認証未実装の制約）
