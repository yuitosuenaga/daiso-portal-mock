# リサーチ・設計決定ログ: inquiry-list

## Gap Analysis（`/kiro:validate-gap` 実施結果）

### Summary

- **Feature**: `inquiry-list`
- **Discovery Scope**: Extension（既存ブラウンフィールド。ルート・型は用意済みだが、一覧表示用のモックデータそのものが存在しない）
- **Key Findings**:
  - `/inquiry`ルートとサイドバー導線は`dashboard`仕様で用意済みで、現在は`PlaceholderPage`を表示しているのみ
  - `types/inquiry.ts`の`Inquiry`型は本仕様が必要とするフィールド（`category`/`urgency`/`storeRegion`/`status`/`createdAt`/`submittedBy`等）を既に満たしており、型定義の変更・追加は不要
  - **重要な発見**: `lib/api/inquiries.ts`の`createInquiry`は送信された`CreateInquiryInput`にIDを付与して返すだけで、**どこにも永続化していない**（配列等への追記なし）。そのため「自社が送信した問い合わせ」を表示するための元データが現状存在しない。ユーザー確認の結果、`announcements`/`links-page`と同様に**ダミーの静的モックデータを新規に用意する**方針で問題ないことを確認済み
  - `getInquiryStatusSummary`（ダッシュボードウィジェット用、`new: 3, in_progress: 7, resolved: 42`の固定値）とは別のデータセットとして扱う想定。新規に用意する一覧用モックデータの件数・内訳をこの集計値に厳密に一致させる必要性は要件上ない（別画面・別関心事のため）
  - `components/ui/badge.tsx`（`announcements`仕様で追加）は現在`variant`が`maintenance`/`policy`/`incident`/`other`という`AnnouncementCategory`固有のキーに限定されている。本仕様が必要とする対応状況（`new`/`in_progress`/`resolved`）・緊急度（`high`/`medium`/`low`）の視覚的区別には、そのままでは使えない
  - `structure.md`のディレクトリ構成案・`product.md`の実装推奨順序に`inquiry-list`が記載されていなかったため、本spec-init時に両方を修正済み

---

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件1 一覧ページ・アクセス | `/inquiry/page.tsx`（Placeholder）、サイドバー導線 | Missing | ルーティング・導線は完成済み。一覧本体の実装のみ不足 |
| 要件2 表示順序・視覚的区別 | なし | Missing | 対応状況・緊急度を区別する表示コンポーネントが未整備 |
| 要件3 状態表示 | `AnnouncementList`/`LinkList`のローディング/エラー/空状態パターン | Missing（パターンは既存） | 同パターンを再利用して実装する必要がある |
| 要件4 詳細表示 | `AnnouncementDetail`の動的ルートパターン（`/announcements/[id]`） | Missing | `/inquiry/[id]`を新規作成する必要がある |
| 要件5 モックAPI連携 | `lib/api/inquiries.ts`（`createInquiry`・`getInquiryStatusSummary`のみ） | Missing / Constraint | 既存2関数は`inquiry-form`仕様が所有し変更不可。新規関数（`getInquiries`・`getInquiryById`）と、それらが参照する静的モックデータ配列を追加する必要がある |
| 要件6 多言語対応 | `messages/*.json`の構造・フォールバック設定済み | Constraint（軽微） | `inquiryList`名前空間を新規追加するだけで対応可能 |
| 要件7 レスポンシブ | 既存仕様のブレークポイント方針 | Constraint（軽微） | 既存方針を適用するだけで対応可能 |

---

### Implementation Approach Options

#### Option A: 既存ファイルの拡張のみで対応
- `inquiry/page.tsx`に一覧ロジックを直接実装
- ❌ `structure.md`が想定する`components/features/inquiry-list/`構成から逸脱

#### Option B: 新規コンポーネント群として構築（Badgeは触らない）
- `src/components/features/inquiry-list/`に一覧・詳細・状態表示用の小コンポーネントを新規作成
- 対応状況・緊急度の視覚的区別は、共有の`Badge`プリミティブを使わず、本機能専用のローカルな表示コンポーネント（Tailwindクラス直書き）で対応
- ✅ 既存の`Badge`（`announcements`仕様が導入）に一切影響を与えない
- ❌ バッジ的な見た目のスタイリングが`Badge`と`inquiry-list`独自コンポーネントの2箇所に分散し、将来的な見た目の一貫性維持コストが増える

#### Option C: 新規コンポーネント群として構築 + Badgeを加法的に拡張（推奨）
- `src/components/features/inquiry-list/`に一覧・詳細を新規作成
- `components/ui/badge.tsx`の`variant`に、既存の`maintenance`/`policy`/`incident`/`other`を**変更せず**、対応状況・緊急度用の新しいキー（例: `new`/`in_progress`/`resolved`/`urgency-high`/`urgency-medium`/`urgency-low`、命名は設計フェーズで確定）を追加する
- ✅ サイト全体でバッジの視覚言語が一貫する。既存の`announcements`利用箇所には影響を与えない（加法的変更のみ）
- ❌ `Badge`という汎用UIプリミティブに複数機能のドメイン固有のキーが集まり、将来的にキー数が増えすぎる可能性がある（現時点では2機能・実質7〜10キー程度なので許容範囲と判断）

**推奨**: Option C。`Badge`は`components/ui/`配下の汎用プリミティブという位置づけであり、既存キーを変更しない加法的拡張であればリスクは低い。

---

### Effort & Risk

- **Effort**: **M（3〜5日）** — 一覧・詳細画面の実装自体は`announcements`と同規模だが、ダミーモックデータの作成（一覧に足る件数・内容の`Inquiry`データを新規に用意する）と、`Badge`の拡張検討が追加で発生する
- **Risk**: **Low** — 新規の外部依存はなく、既存パターン（`AnnouncementList`/`AnnouncementDetail`の「async Server Component + try/catch + Suspense/Skeleton」）を再利用できる。唯一の設計判断は`Badge`拡張の方針決定

---

### Recommendations for Design Phase

- **推奨アプローチ**: Option C
- **主要な決定事項**:
  1. ダミーモックデータの件数・内容（対応状況・緊急度・案件種別が一通り確認できる程度の件数、目安5〜10件程度）
  2. `Badge`に追加する対応状況・緊急度用のvariantキーの具体的な命名
  3. 詳細画面のレイアウト（`AnnouncementDetail`をベースに、自由記述本文・申請者情報をどの順序・粒度で表示するか）
- **Research Needed**: 特になし（新規ライブラリ・外部API連携が発生しないため、軽量な調査で十分）

---

## 設計フェーズでの決定（Light Discoveryの結論）

### Design Decisions

#### Decision: 案件種別・緊急度・国の表示ラベルは`inquiryForm`名前空間の既存翻訳キーを再利用する
- **Context**: `messages/ja.json`/`en.json`を確認したところ、`inquiryForm.options.category`/`urgency`/`country`/`originalLanguage`が`inquiry-form`仕様実装時に既に整備されていることを発見した
- **Alternatives Considered**: 1) `inquiryList`名前空間に案件種別・緊急度・国のラベルを重複して追加する、2) 既存の`inquiryForm.options.*`を読み取り専用で再利用する
- **Selected Approach**: 2) 既存キーを再利用する
- **Rationale**: 同じ値（`defect`/`high`/`JP`等）に対する表示ラベルが2箇所に分散すると、将来の翻訳更新時に片方だけ更新され表示不整合を起こすリスクがある。DRY原則に従い単一のソースを参照する
- **Trade-offs**: `inquiry-list`の翻訳が`inquiry-form`の翻訳キー構造に依存するため、`inquiry-form`側のキー名変更時は`inquiry-list`側も追随が必要（`Revalidation Triggers`に明記済み）
- **Follow-up**: なし

#### Decision: `Badge`に対応状況・緊急度用のvariantを加法的に追加する
- **Context**: 対応状況（new/in_progress/resolved）・緊急度（high/medium/low）を視覚的に区別する必要があるが、既存の`Badge`は`AnnouncementCategory`固有のキーのみを持つ
- **Alternatives Considered**: 1) 本機能専用のローカルな表示コンポーネントを新規作成する、2) 既存の`Badge`を既存キーを変更せず加法的に拡張する
- **Selected Approach**: 2) `Badge`を加法的に拡張する（`status-new`/`status-in_progress`/`status-resolved`/`urgency-high`/`urgency-medium`/`urgency-low`を追加）
- **Rationale**: `Badge`はサイト全体の汎用UIプリミティブという位置づけであり、加法的な変更であれば既存の`announcements`利用箇所に影響を与えない。バッジの視覚言語をサイト全体で一貫させられる
- **Trade-offs**: `Badge`のvariantキー数が増える。将来的に機能が増えるとキー管理が煩雑になる可能性があるが、現時点（2機能・10キー程度）では許容範囲
- **Follow-up**: 3機能目以降でバッジのバリエーションが必要になった場合、ドメインごとのラッパーコンポーネント化を検討する

#### Decision: 一覧用の静的モックデータは5〜10件程度、ダッシュボードの集計値とは独立させる
- **Context**: `getInquiryStatusSummary`は固定値（new: 3, in_progress: 7, resolved: 42）を返すが、これと一覧データの件数を一致させる必要があるか判断が必要だった
- **Alternatives Considered**: 1) 集計値と厳密に一致させる（52件のモックデータが必要）、2) 独立した少数のダミーデータとする
- **Selected Approach**: 2) 独立した少数のダミーデータとする（ユーザー確認済み）
- **Rationale**: 両者は別画面・別関心事であり、フェーズ1のモックとして厳密な整合性を持たせる必要性は要件上ない。少数（5〜10件）で対応状況・緊急度・案件種別が一通り確認できれば十分
- **Trade-offs**: ダッシュボードの集計数値と一覧の件数が一致しないため、実データ的な違和感を指摘される可能性があるが、フェーズ1のモックである旨は`product.md`で明示されている
- **Follow-up**: フェーズ3で実APIに移行する際は、集計APIと一覧APIが同一データソースを参照する設計にする
