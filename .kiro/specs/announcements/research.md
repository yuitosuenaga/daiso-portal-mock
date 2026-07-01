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
