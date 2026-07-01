# リサーチ・設計決定ログ: links-page

## Gap Analysis（`/kiro:validate-gap` 実施結果）

### Summary

- **Feature**: `links-page`
- **Discovery Scope**: New Feature（グリーンフィールド。既存の`Link`型・APIは存在せず、`inquiry-form`/`announcements`のような後方互換の制約もない）
- **Key Findings**:
  - `/links`ルートとサイドバー導線は`dashboard`仕様で用意済みで、現在は`PlaceholderPage`を表示しているのみ
  - `types/link.ts`・`lib/api/links.ts`は未作成（他仕様が依存する既存資産もないため、自由に設計できる）
  - `components/ui/`には`card`・`badge`・`skeleton`が既に整備済みで、カテゴリ別グループ表示（`Card`単位でグループ化）・カテゴリ表示（`Badge`）・ローディング表示（`Skeleton`）をそのまま再利用できる。新規UIプリミティブの追加は不要と判断できる
  - `structure.md`のディレクトリ構成案に`components/features/links/`が既に想定されており、実装先として齟齬がない
  - 外部リンクを新しいタブで開く実装（`target="_blank"` + `rel="noopener noreferrer"`）はNext.jsの標準的な`<a>`タグで対応可能で、技術的な不確実性はない

---

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件1 一覧ページ・アクセス | `/links/page.tsx`（Placeholder）、サイドバー導線 | Missing | ルーティング・導線は完成済み。一覧本体の実装のみ不足 |
| 要件2 カテゴリ別分類 | なし | Missing | `Link`型・カテゴリコード定数が未整備 |
| 要件3 クリック動作 | なし（標準HTML機能で対応可） | Missing | リンク項目コンポーネントの新規実装が必要 |
| 要件4 状態表示 | `AnnouncementWidget`/`AnnouncementList`のローディング/エラー/空状態パターン（`Card`+`Skeleton`+`try/catch`） | Missing（パターンは既存） | 同パターンを再利用して実装する必要がある |
| 要件5 モックAPI連携 | `lib/api/`のモック関数規約（`Promise`を返す） | Missing | `lib/api/links.ts`を新規作成する必要がある |
| 要件6 多言語対応 | `messages/*.json`の構造・フォールバック設定済み | Constraint（軽微） | `links`名前空間を新規追加するだけで対応可能 |
| 要件7 レスポンシブ | `dashboard`/`inquiry-form`/`announcements`仕様のブレークポイント方針 | Constraint（軽微） | 既存方針をカテゴリグループのレイアウトに適用するだけで対応可能 |

---

### Implementation Approach Options

#### Option A: 既存ファイルの拡張のみで対応
- `links/page.tsx`に一覧ロジックを直接実装
- ✅ 新規ファイルが最少
- ❌ `structure.md`が想定する`components/features/links/`構成から逸脱し、カテゴリグループ化ロジックがpage.tsxに集中して肥大化しやすい

#### Option B: 新規コンポーネント群として構築
- `src/components/features/links/`に一覧・カテゴリグループ・リンク項目を新規作成
- ✅ `structure.md`の想定構成と一致、責務分離が明確
- ✅ 既存の`Card`/`Badge`/`Skeleton`をそのまま再利用できるため、新規UIプリミティブが不要

#### Option C: ハイブリッド
- 本機能は既存の共有資産（型・API）への後方互換制約がなく、Option Bと実質的に同じ構成になるため、Aとの差分は「新規ファイルをpage.tsxに集約するか、featuresディレクトリに分離するか」のみ
- Option Bを採用する場合、追加の複雑性はほぼ発生しない

**推奨**: Option B。本機能はグリーンフィールドであり、ハイブリッド構成を検討する動機（既存資産の後方互換確保）が存在しないため、素直に`structure.md`の想定構成に従う。

---

### Effort & Risk

- **Effort**: **S（1〜3日）** — 新規の外部依存・後方互換制約がなく、既存UIプリミティブ（`Card`/`Badge`/`Skeleton`）をそのまま再利用できるため、`announcements`よりも小規模
- **Risk**: **Low** — 技術的な不確実性はなく（`target="_blank"`は標準機能）、既存パターンの組み合わせで完結する

---

### Recommendations for Design Phase

- **推奨アプローチ**: Option B
- **主要な決定事項**:
  1. `Link`型の最終フィールド定義（`id`・`title`・`url`・`category`・説明文の有無）
  2. カテゴリごとのグループ表示の見た目（`Card`を1グループ1枚とするか、`Card`内に複数カテゴリをセクション分けするか）
  3. 外部リンクであることを示す視覚的インジケーター（アイコン等）を設けるかどうか
- **Research Needed**: 特になし（新規ライブラリ・外部API連携が発生しないため、軽量な調査で十分）
