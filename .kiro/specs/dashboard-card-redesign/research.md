# Research & Design Decisions

## Summary
- **Feature**: `dashboard-card-redesign`
- **Discovery Scope**: Extension（既存Next.jsモックアップの一部画面・ナビゲーション構成の再設計）
- **Key Findings**:
  - 両ポータルのトップページは既存の shadcn/ui `Card` コンポーネントと next-intl のみで構築可能であり、新規外部ライブラリの追加は不要
  - `src/lib/api/links.ts` / `faqs.ts` は認証・会社スコープを持たない共通データ関数のため、ヘルプデスク側ページからもそのまま再利用できる
  - 申請者側ダッシュボードの既存5ウィジェット（`AnnouncementWidget`等）はダッシュボードページ以外から参照されておらず、カード形式への置き換えに伴い削除対象となる
  - `announcements-management` spec（別ブランチ、2026-07-02時点で `tasks-approved`）は `/[locale]/helpdesk/announcements` ルートと `HelpdeskSidebar.tsx` へのナビ項目追加を含んでおり、本specとファイル競合の可能性がある（2026-07-02、mainマージ後に解消済み）
  - プレビューパネル追加にあたり、`AnnouncementListItem` / `HelpdeskInquiryListItem` という既存の表示コンポーネントがそのまま再利用可能であり、新規表示ロジックの実装は不要
  - ヘルプデスク側問い合わせ一覧ページは既に `sortInquiriesForHelpdesk`（緊急度→受付日時の並び替え）を持つが、「未着手（未クレーム）優先」は考慮していないため、プレビューパネル専用の新しい並び替え関数が必要

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
- **Implications**: 本specは `/[locale]/helpdesk/announcements` への導線カードのみを実装し、当該ルートの内部実装には関与しない。`HelpdeskSidebar.tsx` は両specが変更するため、実装順序またはマージ順の調整が必要（タスクフェーズで明記）（2026-07-02、mainマージにより解消済み）

### プレビューパネルの表示コンポーネント再利用可否
- **Context**: 「最新のお知らせ」「対応が必要な問い合わせ」プレビューパネルの1行分の表示をどう実装するか
- **Sources Consulted**: `src/components/features/announcements/AnnouncementListItem.tsx`, `src/components/features/helpdesk-inquiries/HelpdeskInquiryListItem.tsx`
- **Findings**: `AnnouncementListItem`（お知らせ1件・タイトル/カテゴリ/日付）、`HelpdeskInquiryListItem`（問い合わせ1件・会社名/種別/緊急度/対応状況、対応中フラグ表示込み）は、いずれもpropsのみで完結する既存の表示コンポーネントであり、ダッシュボードのプレビューパネルからもそのまま再利用できる
- **Implications**: 新規の行表示コンポーネントは実装せず、既存コンポーネントを再利用することで重複実装を避ける

### ヘルプデスク側「未対応」の優先順位付け
- **Context**: 要件6.3「緊急度が高いもの・誰も対応着手していないものが優先的に表示される順序」をどう実現するか
- **Sources Consulted**: `src/lib/helpdesk-inquiry-list.ts`（既存の`sortInquiriesForHelpdesk`）, `src/types/inquiry.ts`（`claim`フィールド）
- **Findings**: 既存の`sortInquiriesForHelpdesk`は緊急度→受付日時の並び替えのみで、`claim`（対応中フラグ・誰が着手しているか）を考慮していない。`Inquiry.claim`は`{ staffName, claimedAt } | null | undefined`の構造を持ち、未着手かどうかを判定できる
- **Implications**: 既存関数を変更せず、「未着手優先→緊急度→受付日時」の3段階で並び替える新しい純関数`sortInquiriesForPriorityPreview`を新設する。既存の問い合わせ一覧ページの並び順には影響を与えない

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

### Decision: プレビューパネルの並び替えロジックを既存ロジックから分離
- **Context**: ヘルプデスク側プレビューパネルの「対応が必要な問い合わせ」の並び順に、既存の問い合わせ一覧ページが使う`sortInquiriesForHelpdesk`をそのまま使うか、専用ロジックを新設するか
- **Alternatives Considered**:
  1. 既存の`sortInquiriesForHelpdesk`に「未着手優先」の考慮を追加する形で改修する
  2. プレビューパネル専用の新しい並び替え関数を新設する
- **Selected Approach**: 2を採用（`sortInquiriesForPriorityPreview`を新設）
- **Rationale**: 既存関数を改修すると、問い合わせ一覧ページ本体（`helpdesk-inquiry-management` specの範囲）の並び順まで変更されてしまい、本spec（`dashboard-card-redesign`）のBoundary Commitments（「各機能ページ自体の内部ロジックの変更」は対象外）に反する
- **Trade-offs**: 似たロジックが2箇所に存在することになるが、責務分離を優先する
- **Follow-up**: なし

## Risks & Mitigations
- `announcements-management` spec とのマージ順によっては `HelpdeskSidebar.tsx` および「お知らせ管理」カードのリンク先が一時的に不整合になる — 2026-07-02、mainマージにより解消済み
- お知らせの「新着7日」しきい値はハードコードの仮値であり、実運用の要望と乖離する可能性がある — ヒアリング後（フェーズ2）に調整可能な設計とする
- `AnnouncementsCard`/`InquiryListCard`（バッジ集計）と`AnnouncementsPreviewPanel`/`PriorityInquiriesPreviewPanel`（内容一覧）が同一データソースに対して重複フェッチを行う — フェーズ1のモックデータ規模では性能影響なし。将来的にキャッシュ層の検討余地あり

## References
- `.kiro/specs/announcements-management/design.md` — ヘルプデスク側お知らせ管理のルート・ナビゲーション変更範囲の確認
- `.kiro/steering/product.md` — フェーズ方針（認証未実装の制約）

---

## 追加ラウンド（2026-09-06）: ブロック構成刷新と「申請」→「問合せ」表記の再統一

### Summary（追加分）
- **調査範囲**: Light discovery（既存実装の拡張）。申請者側ダッシュボードページの現行カード構成、`dashboard`/`helpdeskDashboard`翻訳名前空間の「申請」表記の分布、ダッシュボードページの既存テストの有無を確認した
- **主な発見**:
  1. 申請者側ダッシュボードのカードグリッドは`page.tsx`内に静的に並んだ6要素（申請／申請一覧／お知らせ／ドキュメント／リンク／FAQ）で構成されており、並び替え・追加はこの1ファイルの編集のみで完結する
  2. `src/app/[locale]/(applicant)/page.tsx` に対する単体テストが存在しない（`layout.test.tsx`のみ）。ブロック表示順は今回の要件の中核であるため、回帰を守る新規テストが必要
  3. 文言変更は既存の翻訳キーの**値**のみで完結する。キー名を変更しなければ、キー参照でアサーションしている既存テスト（`AnnouncementsCard.test.tsx`・`InquiryListCard.test.tsx`・`PriorityInquiriesPreviewPanel.test.tsx`等）は無変更で通る

### Research Log（追加分）

#### 新規3ブロックの遷移先の作り分け可否
- **調査内容**: 売場検討会（動画）・マニュアル・POPを`/documents`のカテゴリ別ビューへ振り分けられるか、`documents`spec側の現行実装を確認
- **結果**: 要望として「中身は現状のドキュメント共有と同じものにする」ことが確定しており、カテゴリ別フィルタの作り分けは行わない方針で確定済み。3カードとも同一の`/documents`をhrefとする
- **Implication**: 実装は静的`NavigationCard`3枚の追加のみ。将来`/documents`にカテゴリ別ルート・クエリが実装された場合にhrefを差し替えられるよう、Revalidation Triggerとしてdesign.mdに記録した

#### 「リンク」「よくある質問」カードの扱い
- **調査内容**: サイドバー撤去後、指定6ブロックに含まれない`/links`・`/faq`への到達手段が残るかを確認
- **結果**: サイドバー撤去後はダッシュボードのカードが唯一の導線となるため、両カードを削除すると`/links`・`/faq`はURL直打ち以外で到達不能になる。`links-page`・`faq`は独立specとして実装済みであり、ダッシュボード側の判断でそれらを孤児ルート化するのはspec境界を越える
- **Implication**: 指定6ブロックの後段に据え置く方針を要件15.6として明文化した

#### 「申請」表記の分布と対象/対象外の切り分け
- **調査内容**: `messages/ja.json`内の「申請」の出現箇所を、本spec所有の名前空間（`dashboard.*`・`helpdeskDashboard.*`）とその他specの所有分に切り分け
- **結果**: 本specが値を変更するのは`dashboard.inquiryForm.*`・`dashboard.inquiryList.*`・`dashboard.priorityInquiriesPreview.*`・`dashboard.documents.title`・`helpdeskDashboard.inquiryForm.*`・`helpdeskDashboard.inquiries.*`・`helpdeskDashboard.kpi.viewAll`。`helpdeskCompanies.*`等の「申請者アカウント」（会社側ユーザーアカウントを指すロール語）は対象外
- **Implication**: 名前空間単位で所有specが明確に分かれるため、他spec（`inquiry-form`・`inquiry-list`・`helpdesk-inquiry-management`）の追記要件と作業が競合しない

### Design Decisions（追加分）

#### Decision: 「問合せ」を1ブロックではなく隣接2カードとして表現する
- **Context**: 要望のブロックリストでは「問合せ」は1項目だが、現行実装は「申請」（新規作成、`/inquiry/new`）と「申請一覧」（未対応件数バッジ付き、`/inquiry`）の2カードに分かれている
- **Alternatives Considered**:
  1. 「問合せ」＋「問合せ一覧」を隣接2カードとして指定順の位置に置く
  2. `/inquiry`への1枚に統合し、新規作成は一覧内から導線を張る
  3. 「問合せ」1枚を指定順の位置に置き、「問合せ一覧」はリンク／FAQと同様に後段へ移す
- **Selected Approach**: 1を採用
- **Rationale**: 指定された表示順を保ちながら、未対応件数バッジ（`InquiryListCard`が持つ運用上重要なシグナル）と新規作成へのワンクリック導線の双方を失わずに済む
- **Trade-offs**: グリッド上のカード枚数が指定リストの6を超える（9枚）が、視認性はグリッドレイアウトで担保される
- **Follow-up**: なし

#### Decision: 翻訳キー名を変更せず値のみを差し替える
- **Context**: 「申請」→「問合せ」の統一にあたり、`inquiryForm`・`inquiryList`等のキー名自体をリネームするか
- **Alternatives Considered**:
  1. キー名は維持し、翻訳値のみ変更する
  2. 表記に合わせてキー名もリネームする
- **Selected Approach**: 1を採用
- **Rationale**: キー名は内部識別子であり、UI表記と一致させる必然性がない。リネームすると`titleKey`/`descriptionKey`を文字列で受け渡している`InquiryListCard`・`AnnouncementsCard`とその既存テストが広範に壊れる
- **Trade-offs**: キー名（`inquiryForm`等）と表示文言（「問合せ」）が一致しない状態が残るが、`Inquiry`という内部ドメイン語とは整合している
- **Follow-up**: なし

### Risks & Mitigations（追加分）
- 遷移先が同一（`/documents`）のカードが4枚並ぶため、利用者が「押しても同じページ」と受け取る可能性がある — 要望として確定済みの仕様。将来のカテゴリ別フィルタ実装時に解消できるよう設計上の差し替えポイントを明記した
- ダッシュボードページに既存テストがなく、ブロック順の回帰を検知できない — 表示順と`href`を検証する新規テストを追加する（Testing Strategy参照）
- `helpdeskDashboard.*`の文言変更はヘルプデスク側画面に影響するため、`helpdesk-inquiry-management`spec側の追記要件（Requirement 20）と表記を揃える必要がある — 両specの追記で「問合せ」表記に統一する方針を明記済み
