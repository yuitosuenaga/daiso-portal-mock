# リサーチ・設計決定ログ: inquiry-form

## Gap Analysis（`/kiro:validate-gap` 実施結果）

### Summary

- **Feature**: `inquiry-form`
- **Discovery Scope**: Extension（既存ブラウンフィールド。ルート・ナビゲーション・レイアウトは実装済み、フォーム本体は未実装）
- **Key Findings**:
  - `/inquiry/new` ルートと `nav.inquiryForm` ナビゲーション項目は `dashboard` 仕様実装時に既に用意済みで、現在は `PlaceholderPage` を表示しているのみ
  - `react-hook-form` / `zod` は `tech.md` で採用方針が明記されているが、`package.json` には未インストール。shadcn/ui も CLI 未初期化（`components.json` なし）で、`Button`/`Input`/`Textarea`/`Select`/`Label`/`Form` などのUI基盤コンポーネントが1つも存在しない（既存は `card.tsx` / `skeleton.tsx` のみ）
  - `types/inquiry.ts`（Inquiry本体の型）は未作成。既存の `types/inquiry-summary.ts` はダッシュボードの集計専用型であり、フォーム入力用の型とは別物
  - `lib/api/inquiries.ts` には `getInquiryStatusSummary()` のみ存在。送信用モック関数（`createInquiry` 等）は新規追加が必要
  - `messages/ja.json` / `en.json` には `nav.inquiryForm` のラベルのみ存在。フォーム項目・選択肢・バリデーションエラー・完了メッセージの翻訳キー一式は未定義

---

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件1 画面構造・アクセス | `/inquiry/new/page.tsx`（Placeholder）、`AppShell`、Sidebar導線 | Missing | フォーム本体コンポーネントの実装のみ不足。ルーティング・導線は完成済み |
| 要件2 選択式項目 | なし | Missing | `category`/`urgency`/`storeRegion` の型定義・選択肢定数・UI（Select等）が未整備 |
| 要件3 自由記述・原文言語 | なし | Missing / Unknown | Textarea未導入。ISO 639-1言語コードリストの収録範囲は要検討（Research Needed） |
| 要件4 申請者情報 | なし | Missing / Unknown | 会社名Input・国選択UI未導入。対象国（20か国以上）リストの出典・網羅範囲は要検討（Research Needed） |
| 要件5 バリデーション | `tech.md` で方針明記のみ | Missing / Constraint | `react-hook-form`・`zod` 未インストール。zodスキーマと型の統合パターンがコードベースに前例なし |
| 要件6 送信・モックAPI連携 | `lib/api/inquiries.ts`（同ファイルに追加可）、`dashboard`仕様のモック関数パターン | Missing | `createInquiry` 関数・`Inquiry` 型が未実装。既存パターン（Promise返却）は再利用可能 |
| 要件7 送信結果フィードバック | なし | Missing / Unknown | 成功・失敗の表示方式（インラインメッセージ vs トースト）が未決定。shadcn/ui toastも未導入 |
| 要件8 多言語対応 | `messages/*.json` の構造・フォールバック設定済み | Constraint（軽微） | 既存構造にキーを追加するだけで対応可能。パターンは確立済み |
| 要件9 レスポンシブ | `dashboard`仕様のブレークポイント方針（`md:`/`lg:`） | Constraint（軽微） | 既存方針をフォームのグリッドレイアウトに適用するだけで対応可能 |

---

### Implementation Approach Options

#### Option A: 既存ファイルの拡張のみで対応
- `page.tsx` に直接フォームロジックを実装、`lib/api/inquiries.ts` に追記、型は既存ファイルに追加
- ✅ 新規ファイルが少ない
- ❌ shadcn/ui未導入という制約を回避できない（UI基盤コンポーネントなしでは選択式項目が実装不可）
- ❌ フォームが1ファイルに肥大化し、`structure.md` が定義する `components/features/inquiry-form/` 構成から逸脱する

#### Option B: 新規コンポーネント群として構築
- `src/components/features/inquiry-form/` にフォーム本体・各フィールド・選択肢定数を新規作成
- shadcn/ui CLIで `Button`/`Input`/`Textarea`/`Select`/`Label`/`Form` を新規導入
- `types/inquiry.ts` を新規作成
- ✅ `structure.md` の想定構成と一致、責務分離が明確
- ✅ 他機能（`announcements`等）からもUI基盤コンポーネントを再利用できる
- ❌ 導入コストがやや高い（shadcn/ui初期化、react-hook-form/zod導入が同時発生）

#### Option C: ハイブリッド（推奨）
- **拡張する部分**: `lib/api/inquiries.ts`（`createInquiry`追記）、`messages/ja.json`/`en.json`（キー追加）、`page.tsx`（新規コンポーネントの呼び出しのみに変更）
- **新規作成する部分**: `src/components/features/inquiry-form/`（フォーム本体・フィールド・選択肢定数）、`types/inquiry.ts`、shadcn/ui基盤コンポーネント一式、react-hook-form/zod導入
- ✅ 既存パターン（モックAPI・i18n）を最大限再利用しつつ、新規UI基盤は`structure.md`の想定構成に沿って追加
- ✅ 段階的実装が可能（UI基盤→型→フォーム本体→送信処理の順で積み上げられる）
- ❌ 計画・調整項目が最も多い（後述のResearch Needed項目を設計フェーズで確定させる必要）

---

### Effort & Risk

- **Effort**: **M（3〜7日）** — 既存パターン（モックAPI・i18n・レイアウト）は確立済みで再利用できるが、shadcn/ui初期化・react-hook-form/zod導入・多数の選択式フィールドの実装が新規発生するため
- **Risk**: **Medium** — 技術的な不確実性は低い（react-hook-form/zod/shadcn/uiは`tech.md`で選定済みかつ広く使われるライブラリ）が、選択肢の内容（国リスト・言語コード範囲・エラー表示方式）に関する未決定事項が複数あるため設計フェーズでの確定が必要

---

### Recommendations for Design Phase

- **推奨アプローチ**: Option C（ハイブリッド）
- **主要な決定事項**:
  1. shadcn/ui CLIの初期化方針（`components.json`生成、導入するプリミティブの範囲: Button/Input/Textarea/Select/Label/Form + 送信結果表示用にAlertまたはToastを追加するか）
  2. `types/inquiry.ts` の最終フィールド定義（`structure.md`の仮定義をベースに、フォーム入力に必要な項目のみを`InquiryFormInput`型として分離するか、`Inquiry`型を直接使うか）
  3. `zod`スキーマの配置場所（`lib/validation/inquiry.ts` を新規作成し、フォームと将来のAPI側で共有できる構造にする）
- **Research Needed（設計フェーズで詳細検討）**:
  - 対象20か国以上の国リストの具体的な収録内容・出典（人事/営業側の対象国リストがあれば参照、なければ仮リストを設計時に定義）
  - ISO 639-1言語コードリストの収録範囲（対象国の言語に絞るか、主要言語全体をカバーするか）
  - 送信結果フィードバックのUIパターン（インラインメッセージ vs shadcn/ui Toast導入の是非）
  - `storeRegion` の入力方式（自由入力 / 定義済みリストからの選択 / 両方のハイブリッド）

---

## 設計フェーズ 技術検証（Light Discovery）

### Summary
- **Discovery Scope**: Extension（既存パターンへの統合が中心）
- **Key Findings**:
  - `react-hook-form@7.60+` / `zod@3.25+` / `@hookform/resolvers@5.1+`（zodリゾルバ）は React 18・Next.js 14 との組み合わせで広く実績があり、互換性上の懸念はない
  - 既存の `globals.css` の CSS変数（`--background`/`--border`/`--input`/`--ring` 等）と `tailwind.config.ts` の色定義は shadcn/ui 標準トークンと一致しており、`card.tsx`/`skeleton.tsx` も shadcn/ui CLIを使わず手書きで追加された形跡がある（`components.json` 未生成）。よって Button/Input/Textarea/Label/Select/Alert も同様に **CLIを使わず既存パターンを模倣して手書きで追加** する方針が既存コードベースと一貫する
  - Gap Analysisで挙げた未決定事項（国・言語コードリスト、`storeRegion`入力方式、送信結果フィードバックUI）は本フェーズで以下のとおり決定した

### Research Log

#### react-hook-form + zod の技術検証
- **Context**: `tech.md` で採用方針が明記されているが、コードベースに前例がなく初導入となるため最小限の検証を実施
- **Sources Consulted**: [@hookform/resolvers npm](https://www.npmjs.com/package/@hookform/resolvers), [react-hook-form 公式ドキュメント](https://react-hook-form.com/docs/useform), [shadcn/ui React Hook Form ガイド](https://ui.shadcn.com/docs/forms/react-hook-form)
- **Findings**: 調査時点の最新安定版は `react-hook-form@7.60.0` + `zod@3.25.76` + `@hookform/resolvers@5.1.1` だったが、実際に `npm install` を実行した時点（タスク1.1実装時）ではさらに新しい `react-hook-form@7.80.0` + `zod@4.4.3` + `@hookform/resolvers@5.4.0` がインストールされた。`@hookform/resolvers@5.x` は zod v4 の `zodResolver` をサポートしており、`z.object`/`z.enum`/`z.string().min/max` など本機能で使用する基本APIはv3/v4間で互換性がある
- **Implications**: バージョン固定は行わず、インストールされた最新版（zod v4系）を採用する。`npx tsc --noEmit` および `npm run build` で型エラー・ビルドエラーがないことを確認済み

#### shadcn/ui コンポーネント導入方式
- **Context**: shadcn/ui CLI（`components.json`生成）を使うか、既存の `card.tsx` 同様に手書きで追加するかの判断が必要
- **Findings**: 既存の `card.tsx`/`skeleton.tsx` は shadcn/ui の標準実装パターン（`forwardRef` + `cn` + CSS変数ベースのクラス）に忠実だが、CLIが生成する `components.json` がリポジトリに存在しない。CSS変数・Tailwindトークンは既にshadcn/ui標準と一致済み
- **Implications**: CLIを新規導入せず、既存パターンを模倣して `Button`/`Input`/`Textarea`/`Label`/`Select`/`Alert` を手書きで追加する。将来的にCLIを導入する場合も生成コードとの互換性は保たれる

### Design Decisions

#### Decision: `storeRegion` は自由入力とする
- **Context**: 店舗・地域の入力方式（自由入力 / リスト選択）が未決定だった
- **Alternatives Considered**: 1) 定義済みリストからの選択、2) 自由入力、3) 両方のハイブリッド
- **Selected Approach**: 自由入力（テキスト入力）
- **Rationale**: 店舗・地域の master データがフェーズ1では存在せず、20か国以上の販社ごとに店舗表記が異なるため、リスト化は現時点で過剰な準備コストになる
- **Trade-offs**: 表記ゆれが発生し得るが、ヒアリング結果を反映するフェーズ2で見直す前提の仮仕様として許容する
- **Follow-up**: フェーズ2のヒアリング結果を反映する際に、選択式リストへの変更を検討する

#### Decision: 国・原文言語の選択肢はコードベースの定数として管理し、表示ラベルは翻訳キー経由で提供する
- **Context**: 対象国（20か国以上）・原文言語（ISO 639-1）の選択肢の管理方法が未決定だった
- **Alternatives Considered**: 1) ハードコードされた文字列配列、2) コード（ISO 3166-1 alpha-2 / ISO 639-1）を定数ファイルに保持し表示名は翻訳キー経由、3) 外部API/ライブラリでの動的取得
- **Selected Approach**: 2）コードを `lib/constants/inquiry-options.ts` に定数として保持し、表示ラベルは `messages/*.json` の翻訳キー（`inquiryForm.options.country.<code>` 等）経由で提供する
- **Rationale**: `tech.md` の「表示テキストは全て翻訳キー経由」の規約に合致し、値（コード）と表示（翻訳）を分離できる。フェーズ3での実データ移行時もコードをキーとして再利用できる
- **Trade-offs**: 言語追加時に定数ファイルと翻訳ファイルの両方を更新する必要がある
- **Follow-up**: 収録する国・言語の具体的な範囲はフェーズ2のヒアリング結果で調整する。設計フェーズでは代表的な範囲を仮リストとして定義する

#### Decision: 送信結果フィードバックはインラインバナー（Alert）方式とし、トースト通知は導入しない
- **Context**: 送信成功・失敗の表示方式（インラインメッセージ / トースト通知）が未決定だった
- **Alternatives Considered**: 1) shadcn/ui Toast（Radix Toast等の新規依存追加）、2) フォーム上部のインラインAlertバナー
- **Selected Approach**: 2）インラインAlertバナー
- **Rationale**: トースト通知は新規の依存ライブラリ導入とグローバルなProvider配置が必要になり、本機能単体のスコープに対して過剰な複雑性となる。フォーム上部のバナーで要件7を満たせる
- **Trade-offs**: 画面遷移せずにフォームをリセットする場合、バナーがユーザーの目に入りやすい位置にある必要がある（フォーム最上部に固定表示する）
- **Follow-up**: 他機能でも成功・失敗フィードバックが必要になった場合、`components/ui/alert.tsx` を共通利用する
