# リサーチ・設計決定ログ: faq

## Gap Analysis（`/kiro:validate-gap` 実施結果）

### Summary

- **Feature**: `faq`
- **Discovery Scope**: Extension（既存ブラウンフィールド。`/faq`ルート・サイドバー導線は`dashboard`仕様で用意済みだが、FAQ本体のドメインコード・データは一切存在しない）
- **Key Findings**:
  - `/faq`ルートとサイドバー導線は`dashboard`仕様で用意済みで、現在は`PlaceholderPage`を表示しているのみ
  - `Faq`型・カテゴリ定数は未定義。`Announcement`/`Link`/`Inquiry`のいずれとも独立した新規ドメインとして定義する必要がある
  - 既存のリスト系コンポーネント（`AnnouncementList`/`LinkList`/`InquiryList`）はすべて`async Server Component`で、クリック操作を伴わない読み取り専用表示。本機能の要件3（アコーディオン開閉）は、リスト画面として初めてクライアント側の表示状態（開閉state）を持つケースになる
  - アコーディオンUIプリミティブは未導入。`package.json`には`@radix-ui/react-slot`（`Button`用）のみが存在し、`@radix-ui/react-accordion`等は導入されていない
  - `links-page`仕様の`LinkCategoryGroup`コンポーネント・`LINK_CATEGORY_CODES`定数によるカテゴリ別グループ化ループは、構造としてFAQのカテゴリ別表示にも応用できる考え方だが、`Link`型（URL・新タブ挙動）に特化しているため、コンポーネント自体を直接再利用することはできない
  - `tech.md`の「状態管理はReact標準機能のみ」という方針上、アコーディオンの開閉状態管理も`useState`等の標準機能で実装する前提となる

---

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件1 一覧ページ・アクセス | `/faq/page.tsx`（Placeholder）、サイドバー導線 | Missing | ルーティング・導線は完成済み。一覧本体の実装のみ不足 |
| 要件2 カテゴリ別分類 | `LinkCategoryGroup`・`LINK_CATEGORY_CODES`（構造パターンのみ参考可） | Missing（パターンは既存） | 型が異なるため直接再利用不可。FAQ専用のグループ化コンポーネント・定数が必要 |
| 要件3 アコーディオン表示 | なし | Missing | クライアント側の開閉state管理、キーボード操作、`aria-expanded`対応が新規に必要。アコーディオンUIプリミティブの導入方針が未決定 |
| 要件4 状態表示 | `AnnouncementList`/`LinkList`のローディング/エラー/空状態パターン | Missing（パターンは既存） | 同パターンを再利用して実装する必要がある |
| 要件5 モックAPI連携 | なし（`lib/api/faqs.ts`自体が存在しない） | Missing | 型定義・定数・モック関数（`getFaqs`）を新規に一式作成する必要がある |
| 要件6 多言語対応 | `messages/*.json`の構造・フォールバック設定済み | Constraint（軽微） | `faq`名前空間を新規追加するだけで対応可能 |
| 要件7 レスポンシブ | 既存仕様のブレークポイント方針 | Constraint（軽微） | 既存方針を適用するだけで対応可能。アコーディオン展開時のレイアウト崩れ確認が追加観点 |

---

### Implementation Approach Options

#### カテゴリ表示コンポーネントの構成

**Option A: 既存`LinkCategoryGroup`を汎用化して転用**
- `LinkCategoryGroup`をFAQ・リンク集で共有可能な汎用コンポーネントに改修
- ❌ `Link`型固有のURL・新タブ挙動とFAQ固有のアコーディオン開閉ロジックが混在し、単一責任の原則から外れる
- ❌ `links-page`仕様が所有する既存コンポーネントを変更するリスクが生じ、境界を越える

**Option B: 新規コンポーネント群として構築（推奨）**
- `src/components/features/faq/`に`FaqList`・`FaqCategoryGroup`・`FaqItem`を新規作成
- カテゴリ別グループ化の「ループ構造」の考え方だけを参考にし、コード自体は独立させる
- ✅ `links-page`仕様に一切影響を与えない
- ✅ アコーディオン特有のクライアント側ロジックを独立して実装・テストできる
- ❌ カテゴリグループ化のループ構造が`LinkList`と若干重複する（型が異なるため共通化は困難と判断）

**推奨**: Option B。既存仕様への影響を避け、責務を明確に分離できる。

#### アコーディオンUIプリミティブの導入方針

**Option C-1: `@radix-ui/react-accordion`を新規導入**
- shadcn/ui流に`components/ui/accordion.tsx`を追加し、Radixプリミティブをラップする
- ✅ `aria-expanded`・キーボード操作（Enter/Space/矢印キー）等のアクセシビリティが標準で担保される（要件3.4/3.5に直結）
- ✅ 既存の`Button`が同じ`@radix-ui/*`系列を使用しており、技術選定として一貫性がある
- ❌ 新規npm依存が1つ増える

**Option C-2: 素朴な`useState` + `button`/`div`で自前実装**
- 質問ごとの開閉状態を`Record<string, boolean>`等で管理し、クリック・キー操作を自前でハンドリング
- ✅ 新規依存を追加しない
- ❌ `aria-expanded`・キーボード操作を自前実装する必要があり、実装・テストの手間とアクセシビリティ品質のばらつきリスクが増える

**推奨**: Option C-1。既存の`Button`と同系列の依存であり、要件3が求めるアクセシビリティ水準を確実に満たせる。ただし新規依存追加の是非は設計フェーズで最終確認する。

---

### Effort & Risk

- **Effort**: **M（3〜5日）** — 型・モックAPI・カテゴリ表示コンポーネントの新規作成は`links-page`と同規模だが、本機能が初めて導入するクライアント側アコーディオン開閉ロジック（状態管理・キーボード操作・アクセシビリティ対応）が追加要素となる
- **Risk**: **Low〜Medium** — 新規外部依存（Radix Accordion採用の場合）の導入検証と、開閉状態管理の設計判断が必要な点で既存機能よりやや複雑だが、`tech.md`の「状態管理はReact標準機能のみ」という方針の範囲内（`useState`レベル）に収まるため全体としては低〜中程度

---

### Recommendations for Design Phase

- **推奨アプローチ**: カテゴリ表示はOption B（新規コンポーネント群）、アコーディオンはOption C-1（`@radix-ui/react-accordion`導入）
- **主要な決定事項**:
  1. アコーディオンUIプリミティブを新規導入するか、自前実装で対応するか
  2. FAQモックデータの件数・内容（カテゴリが一通り確認できる程度、目安8〜12件程度）
  3. 質問一覧のグルーピング方法（カテゴリごとに独立したアコーディオン群とするか、全質問を1つのアコーディオンリストにまとめカテゴリを見出しで区切るか）
- **Research Needed**: `@radix-ui/react-accordion`の最新バージョン・Next.js 14 App Routerとの互換性・Server Component境界での使用方法（`"use client"`境界の置き方）を設計フェーズで確認する

---

## 設計フェーズでの確認結果（Light Discoveryの結論）

### Decision: `@radix-ui/react-accordion`を新規導入する

- **Context**: 要件3.4/3.5（キーボード操作・`aria-expanded`によるアクセシビリティ対応）を確実に満たすため、Radix Accordionの導入可否を設計フェーズで最終確認する必要があった
- **Sources Consulted**: `npm view @radix-ui/react-accordion versions/peerDependencies`（2026-07-01時点で最新版`1.2.15`を確認）
- **Findings**:
  - 最新版は`1.2.15`（2026-07-01時点）
  - `peerDependencies`は`react`/`react-dom`とも`^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc`で、本プロジェクトの`react@18.3.1`と互換
  - 既存の`@radix-ui/react-slot@1.3.0`（`Button`が使用）と同系列のライブラリであり、技術選定の一貫性がある
- **Implications**: 新規依存として`package.json`に追加する。Server Component（`FaqList`/`FaqCategoryGroup`）とClient Component（`FaqAccordion`）を分離し、`"use client"`境界は開閉インタラクションを持つ`FaqAccordion`のみに置く
- **Selected Approach**: Option C-1（Radix Accordion導入）を採用
- **Rationale**: 自前実装（Option C-2）に比べてアクセシビリティ品質を標準機能で確実に担保できる
- **Trade-offs**: 新規npm依存が1つ増えるが、既存の`@radix-ui/react-slot`と同系列のため管理コストは小さい
- **Follow-up**: 実装時に`npm install @radix-ui/react-accordion`のバージョンを`1.2.15`（または実装時点の最新パッチ）で固定する
