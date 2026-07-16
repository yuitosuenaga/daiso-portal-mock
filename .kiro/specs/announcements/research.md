# リサーチ・設計決定ログ: announcements

## Gap Analysis（`/kiro:validate-gap` 実施結果）

### Summary

- **Feature**: `announcements`
- **Discovery Scope**: Extension（既存ブラウンフィールド。ルート・ナビゲーション・ダッシュボードウィジェットは実装済み、一覧・詳細本体は未実装）
- **Key Findings**:
  - `/announcements` ルートと `nav.announcements` ナビゲーション項目は `dashboard` 仕様実装時に用意済みで、現在は `PlaceholderPage` を表示しているのみ
  - `Announcement` 型（`id`/`title`/`publishedAt`）と `getRecentAnnouncements()` は `dashboard` 仕様の `AnnouncementWidget` が既に利用中。本仕様は両者に対して**後方互換な追加のみ**を行う必要がある
  - `components/ui/`（`button`/`input`/`label`/`select`/`textarea`/`alert`/`card`/`skeleton`）は `dashboard`・`inquiry-form` 仕様で整備済みで、そのまま再利用できる。ただし種別（category）を視覚的に区別するための「バッジ」相当のプリミティブは存在しない
  - `structure.md` のディレクトリ構成案には既に `components/features/announcements/` が想定されており、本仕様の実装先として齟齬がない
  - このリポジトリには動的ルート（`[id]` のようなパラメータ付きルート）の前例がまだ存在しない（お知らせ詳細画面が初の動的ルートになる）

---

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件1 一覧ページ・アクセス | `/announcements/page.tsx`（Placeholder）、サイドバー導線 | Missing | ルーティング・導線は完成済み。一覧本体の実装のみ不足 |
| 要件2 表示順序・状態表示 | `AnnouncementWidget` のローディング/エラー/空状態パターン（`Card`+`Skeleton`+`try/catch`） | Missing（パターンは既存） | 一覧ページ向けに同パターンを再利用して実装する必要がある |
| 要件3 詳細表示 | なし（動的ルートの前例なし） | Missing | `app/[locale]/announcements/[id]/page.tsx` を新規作成する必要がある |
| 要件4 種別（category） | なし | Missing | 型・定数・視覚的表示（バッジ相当のUI）がいずれも未整備 |
| 要件5 モックAPI連携 | `types/announcement.ts`（`id`/`title`/`publishedAt`のみ）、`lib/api/announcements.ts`（`getRecentAnnouncements`のみ） | Missing / Constraint | 既存の型・関数は`dashboard`仕様が利用中のため、破壊的変更は不可（後方互換の追加のみ許容） |
| 要件6 多言語対応 | `messages/*.json` の構造・フォールバック設定済み、`dashboard.announcements`名前空間（ウィジェット専用） | Constraint（軽微） | 一覧・詳細・種別ラベル用に新規の`announcements`名前空間を追加するだけで対応可能 |
| 要件7 レスポンシブ | `dashboard`/`inquiry-form`仕様のブレークポイント方針 | Constraint（軽微） | 既存方針を一覧・詳細レイアウトに適用するだけで対応可能 |

---

### Implementation Approach Options

#### Option A: 既存ファイルの拡張のみで対応
- `announcements/page.tsx` に一覧ロジックを直接実装、`[id]/page.tsx` にも詳細ロジックを直接実装
- ✅ 新規ファイルが少ない
- ❌ `structure.md` が想定する `components/features/announcements/` 構成から逸脱し、一覧・詳細・種別バッジのロジックが2つの `page.tsx` に分散して重複しやすい

#### Option B: 新規コンポーネント群として構築
- `src/components/features/announcements/` に一覧・一覧項目・詳細・種別バッジを新規作成
- 型・API層（`types/announcement.ts`・`lib/api/announcements.ts`）は変更せず、別の新規ファイルで補う
- ✅ 責務分離が明確、`structure.md` の想定構成と一致
- ❌ 型・APIの拡張が必要な要件（要件5）に対応する変更点が曖昧になる

#### Option C: ハイブリッド（推奨）
- **拡張する部分**: `types/announcement.ts`（`category`・`body`等を追加、既存フィールドは変更しない）、`lib/api/announcements.ts`（`getRecentAnnouncements`の型・実装は不変のまま、`getAnnouncementById`を新規追加）、`messages/ja.json`・`en.json`（`announcements`名前空間を新規追加）
- **新規作成する部分**: `src/components/features/announcements/`（一覧・一覧項目・詳細本体）、`src/components/ui/badge.tsx`（種別を視覚的に区別する汎用バッジ）、`app/[locale]/announcements/[id]/page.tsx`（動的ルート）
- ✅ `dashboard`仕様の既存実装（`AnnouncementWidget`・`getRecentAnnouncements`の型契約）に一切影響を与えない
- ✅ 既存パターン（`Card`/`Skeleton`/`try-catch`によるローディング・エラー処理、モックAPI規約、i18n規約）を最大限再利用できる
- ❌ 型拡張後、`dashboard`仕様側で`Announcement`型を使う箇所に意図せぬ影響がないか確認する手間が発生する（後方互換の確認コストのみ、実装コストは小さい）

---

### Effort & Risk

- **Effort**: **S〜M（3〜5日）** — 新規の外部依存はなく、一覧・詳細ともに既存パターン（Server Component + `try/catch` + Suspense/Skeleton）の再利用で実装できる。動的ルート（`[id]`）自体はNext.js App Routerの標準機能で技術的な不確実性は低い
- **Risk**: **Low** — `inquiry-form`と異なり新規ライブラリ導入が不要。唯一の新規判断はバッジUIプリミティブの追加程度で、既存のUI基盤（`button.tsx`等）と同じ手書きパターンを踏襲すれば十分

---

### Recommendations for Design Phase

- **推奨アプローチ**: Option C（ハイブリッド）
- **主要な決定事項**:
  1. `Announcement`型に追加するフィールドの最終形（`category`のコード一覧、`body`の型—単純な複数行テキストか簡易マークダウンか）
  2. お知らせ詳細取得のモック関数のエラー表現（存在しないIDの場合に`null`を返すか、rejectするか）と、それに対応する要件3.3の「見つからない」表示の実装方法
  3. 種別バッジの視覚的表現（色分けの具体的な配色—既存の`--destructive`/`--success`パターンに加えて新規トークンが必要か、既存の`--muted`/`--accent`等の組み合わせで十分か）
- **Research Needed**: 特になし（新規ライブラリ・外部API連携が発生しないため、軽量な調査で十分）

---

## 設計フェーズでの決定（Light Discoveryの結論）

### Design Decisions

#### Decision: 一覧全件取得は既存の `getRecentAnnouncements` を再利用せず、新規関数 `getAnnouncements` を追加する
- **Context**: 一覧ページは全件（または十分な件数）を表示する必要があるが、既存の `getRecentAnnouncements` は `limit`（デフォルト3件）で件数を制限する設計になっている
- **Alternatives Considered**: 1) `getRecentAnnouncements` の `limit` 引数に大きな値を渡す、2) `limit` 未指定時のデフォルト挙動を「全件」に変更する、3) 新規関数 `getAnnouncements` を追加する
- **Selected Approach**: 3) 新規関数を追加する
- **Rationale**: `dashboard` 仕様が所有する `getRecentAnnouncements` のコード・挙動を一切変更しないことで、後方互換性の検証コストをゼロにできる。関数名も「一覧全件」の意図と一致する
- **Trade-offs**: モックデータ配列を参照する箇所が2関数に分かれるが、フェーズ1の少量データでは実害はない
- **Follow-up**: フェーズ3で実APIに移行する際、一覧APIの設計（ページネーション等）を検討する

#### Decision: 詳細が存在しない場合は `null` を返す（例外にしない）
- **Context**: 要件3.3「存在しないIDが指定された場合に見つからないメッセージを表示する」を実現する方法の選択
- **Alternatives Considered**: 1) 見つからない場合に例外をthrow/rejectする、2) `null` を解決する
- **Selected Approach**: 2) `null` を解決する
- **Rationale**: 「見つからない」は正常系の一種（想定される状態）であり、通信・実装エラーとは区別すべきという設計判断。`try/catch` の catch 節は「本当のエラー」専用にできる
- **Trade-offs**: 呼び出し側で `null` チェックを明示的に行う必要がある
- **Follow-up**: フェーズ3の実API設計時、HTTPステータス（404等）から同様に `null`/エラーを分離するマッピング方針を検討する

#### Decision: 種別バッジの配色は既存CSS変数トークンを再利用する（新規トークン追加なし）
- **Context**: 種別（category）を視覚的に区別する配色が必要
- **Alternatives Considered**: 1) 種別ごとの新規CSS変数を追加する、2) 既存の `--accent`/`--secondary`/`--destructive`/`--muted` を再利用する
- **Selected Approach**: 2) 既存トークンを再利用する（`incident`→destructive, `policy`→secondary, `maintenance`→accent, `other`→muted）
- **Rationale**: デザイントークンの増加を避け、既存の `Alert`/`Button` 等と一貫した配色体系を維持できる
- **Trade-offs**: 4種別の配色が既存トークンの意味（例: destructiveは通常エラー用）と完全に一致しない可能性があるが、「障害情報は警戒色」という意図には合致する
- **Follow-up**: フェーズ2のヒアリング結果で種別が変わった場合、配色マッピングも合わせて見直す

---

## 追加ラウンド（2026-07-07）: タイトル・種別による検索、対応要否の表示

### Summary（追加分）
- **Discovery Scope**: Extension（既存の実装済み一覧・詳細への追加）
- **Key Findings**:
  - `announcements-management`specが同一ラウンドで確立する`helpdesk-announcement-list.ts`（フィルタ型・フィルタ関数）+ `AnnouncementFilterBar` + クライアントラッパーのパターンをそのまま申請者側にも適用できる
  - 申請者側の`AnnouncementList`は現状サーバーコンポーネント単体で完結しており、クライアント側の状態（フィルタ）を持たせるには`helpdesk-inquiry-management`/`announcements-management`と同様にサーバー/クライアント分割が必要
  - `actionRequired`バッジは既存の「対応中バッジ」（`inquiry-list`spec）と同じ「真のときのみ表示、偽のときは要素ごと非表示」パターンを踏襲する

### Research Log（追加分）

#### 申請者側フィルタの実装方針
- **Context**: お知らせ一覧にタイトル・種別・対応要否の検索・絞り込みを追加する（要件8, 9.4）
- **Sources Consulted**: `src/components/features/announcements/AnnouncementList.tsx`（現状のサーバーコンポーネント構成）、`announcements-management`specが新設する`AnnouncementFilterBar`/`AnnouncementManagementListClient`/`lib/helpdesk-announcement-list.ts`
- **Findings**: ヘルプデスク側と同型の「サーバーで全件取得→クライアントでフィルタ」を適用すれば、既存のCard/Skeleton構成を維持したまま最小差分で実装できる。ただし申請者側は検索対象が自社向けにフィルタ済みのデータ（`getAnnouncements()`が返す配信対象フィルタ後の配列）である点が管理側と異なる
- **Implications**: 新規`src/lib/announcement-list.ts`（申請者側専用のフィルタ型・フィルタ関数。ヘルプデスク側の`lib/helpdesk-announcement-list.ts`とはオーナーspecが異なるため型・実装は分離し、コードの重複は許容する。両者はデータ形状が同じでも一覧の利用者・境界が異なるため共有モジュール化はしない）、`AnnouncementFilterBar`（申請者側専用、新規）、`AnnouncementListClient`（新規）を追加する

#### 対応要否バッジの表示条件
- **Context**: `actionRequired`が真のときのみバッジを表示する（要件9.2, 9.3）
- **Sources Consulted**: `inquiry-list`specの「対応中バッジ」実装（`InquiryDetail.tsx`、要件9.1〜9.3と同型の条件分岐）
- **Findings**: 同specで確立済みの「真のときのみ要素を描画し、偽のときはDOMに一切出力しない」条件分岐パターンがそのまま流用できる
- **Implications**: `AnnouncementListItem`・`AnnouncementDetail`の両方で`{announcement.actionRequired && <Badge variant="default">...</Badge>}`という同一パターンを適用する

### Design Decisions（追加分）

#### Decision: 申請者側とヘルプデスク側でフィルタ型・関数を分離する
- **Context**: 両画面とも「キーワード・種別（・対応要否）でのAND条件フィルタ」という同じ形の処理を必要とする
- **Alternatives Considered**: 1. 共通の`lib/announcement-filters.ts`に集約し両specから参照する 2. spec境界に沿ってそれぞれが独自に実装する（Option A）
- **Selected Approach**: Option A
- **Rationale**: `announcements`と`announcements-management`は別画面・別specであり（本プロジェクトの1画面=1spec原則）、共有モジュールを作ると変更時に一方のspecがもう一方の変更に追従する必要が生まれ、境界があいまいになる。フィルタ関数自体は数行の軽量なロジックであり、重複のコストより境界の明確さを優先する
- **Trade-offs**: 将来フィルタ条件の仕様が変わった場合、2箇所を個別に修正する必要がある
- **Follow-up**: なし

### Risks & Mitigations（追加分）
- `announcements-management`spec側の`Announcement.actionRequired`追加が先に完了していないと、本specの表示ロジックが参照するフィールドが存在せず型エラーになる — 両specの実装順序を揃える、または`actionRequired`を先に型定義に追加してから両spec分の表示・設定ロジックを実装する
- `AnnouncementList`のサーバー/クライアント分割時、既存のローディング・エラー・空状態のUIを壊す — 既存のCard/Skeleton構造をそのままサーバーコンポーネント側に残し、フィルタ機能のみクライアント側に切り出す（`announcements-management`と同じ移行方針）

### References（追加分）
- `.kiro/specs/announcements-management/design.md`「追加ラウンド（2026-07-07）」— フィルタパターンの参照元
- `src/components/features/inquiry-list/InquiryDetail.tsx` — 条件付きバッジ表示パターン

## Research Log（2026-07-13追加ラウンド: 対応状況の自己記録）

### 確認済み自動記録のトリガー位置
- **Context**: 「詳細画面を開いたら自動的に確認済みを記録する」という要件（15.1）を、Server Component（`AnnouncementDetail`）とClient Component（新設パネル）のどちらで実行するか
- **Sources Consulted**: `src/components/features/announcements/AnnouncementDetail.tsx`（既存、async Server Component）、Next.js `<Link>`のプリフェッチ挙動に関する既知の仕様（ビューポート内リンクはデフォルトでプリフェッチされ、対象ページのレンダリングが先行実行されうる）
- **Findings**: `AnnouncementDetail`はサーバーコンポーネントであり、レンダリングされること自体が「ユーザーが実際に開いた」ことを保証しない（一覧画面での`<Link>`プリフェッチにより、スクロールで表示範囲に入るだけでレンダリングが先行実行される可能性がある）
- **Implications**: 記録処理はサーバーコンポーネントのレンダリング内では行わず、実際にブラウザにマウントされたときのみ発火するクライアント側`useEffect`から呼び出す設計とする（`AnnouncementSelfReportPanel`）

### `announcements-management`要件23が提供する関数の呼び出し方針
- **Context**: 記録・読み取り関数の実体は`announcements-management`spec側にあるため、本spec側からの呼び出し方式を検討した
- **Sources Consulted**: 既存の`isReminderPendingForCompany`呼び出しパターン（`AnnouncementDetail`/`AnnouncementList`、読み取り専用）
- **Findings**: 既存のリマインド受信表示は「読み取り専用関数をServer Componentから直接呼び出す」だけで済んでいたが、今回は書き込み（記録）を伴うため、クライアントから呼び出せるServer Actionが必要。`announcements-management`spec側が新設する`confirmAnnouncementAction`/`completeAnnouncementAction`（Server Actions）をそのまま利用する
- **Implications**: 本specはServer Actionsの実装を持たず、呼び出し元（Client Component）としてのみ関わる。境界の引き方は既存のリマインド受信表示と同一（データ・ロジックは`announcements-management`側、UIトリガーは本spec側）

### Risks & Mitigations（追加分）
- `announcements-management`spec側の`confirmAnnouncementAction`/`completeAnnouncementAction`/`getAnnouncementSelfStatus`の実装が先に完了していないと、本specの`AnnouncementSelfReportPanel`が参照する関数が存在せず型エラーになる — 両specの実装順序を揃える、または`announcements-management`側のスタブ実装を先に用意してから本spec側の結線を行う
- マウント時の自動記録が失敗（ネットワークエラー・未認証）した場合にユーザーへエラーを表示すると、詳細画面の閲覧自体を妨げる体験になる — 失敗時はローカル状態を変更せず静かに失敗させ、詳細画面の閲覧自体は継続できるようにする（要件15の目的は「実態に近い浸透状況の可視化」であり、記録失敗を理由に閲覧を止める必要はない）

### References（追加分）
- `src/components/features/announcements/AnnouncementDetail.tsx` — 既存の`isReminderPendingForCompany`呼び出しパターン
- `src/components/features/announcements/AnnouncementList.tsx` — `reminderPendingEntries`の並行取得パターン
- `.kiro/specs/announcements-management/design.md`「追加ラウンド（2026-07-13）」— `confirmAnnouncementAction`等の提供元設計

## Research Log（2026-07-16追加ラウンド: 多言語コンテンツの表示側対応）

### 既存のロケール取得パターンの調査
- **Context**: `announcements-management`spec側で言語別コンテンツ（`AnnouncementTranslation`）が追加されるにあたり、本spec側の一覧・詳細画面が「現在のUIロケール」をどう取得し、既存のAPI呼び出しに渡すかを調査した
- **Sources Consulted**: `src/components/features/announcements/AnnouncementList.tsx`・`AnnouncementDetail.tsx`（いずれも既に`next-intl/server`の`getLocale()`を日付フォーマット表示のため呼び出し済み）
- **Findings**: 両コンポーネントは既にサーバーサイドで`locale`を取得済みであり、新規の取得ロジックを追加する必要がない
- **Implications**: `getAnnouncements`/`getAnnouncementById`の呼び出しに、既存の`locale`変数をオプション引数として渡すだけで実現できる。新規コンポーネント・新規のロケール取得コードは不要

### ダッシュボードウィジェットへの反映範囲の調査
- **Context**: 要件16.5「`getRecentAnnouncements`が返すタイトルが現在のUIロケールに対応する」を、`dashboard`spec側のコードを変更せずに満たせるかを調査した
- **Sources Consulted**: `dashboard`spec所有の`AnnouncementWidget`（`getRecentAnnouncements()`を引数なしで呼び出す既存実装、本spec・`announcements-management`specのいずれもOut of Boundaryとして変更しない対象）
- **Findings**: `getRecentAnnouncements`にロケールのオプション引数を追加しても、`dashboard`spec側の呼び出しコードを変更しない限り、ウィジェットは常に既定言語（`ja`）で表示され続ける
- **Implications**: 本ラウンドはデータ層（関数シグネチャの後方互換な拡張）のみを完了させ、ウィジェット自体への反映は`dashboard`spec側の追従が必要なRevalidation Triggerとして明記する（本ラウンドのスコープには含めない）

### Risks & Mitigations（追加分）
- `dashboard`spec側が`getRecentAnnouncements`の新オプションに追従しない限り、ウィジェットの表示言語がUIロケールと食い違う状態が残る — Revalidation Triggersとして`design.md`に明記し、`dashboard`spec側の次回改修時に対応する

### References（追加分）
- `src/components/features/announcements/AnnouncementList.tsx` / `AnnouncementDetail.tsx` — 既存の`getLocale()`呼び出しパターン
- `.kiro/specs/announcements-management/design.md`「追加ラウンド（2026-07-16）」— `resolveAnnouncementContent`・`AnnouncementTranslation`の提供元設計
