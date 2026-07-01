# リサーチ・設計決定ログ: dashboard

## Summary

- **Feature**: `dashboard`
- **Discovery Scope**: New Feature（グリーンフィールド。既存コードなし）
- **Key Findings**:
  - next-intl v3 の App Router 統合は `[locale]` ディレクトリ方式が推奨。ミドルウェアによるロケール検出・リダイレクトを組み合わせる
  - Next.js Nested Layouts により、AppShell（ヘッダー・サイドバー）をすべてのページで共有できる。ページ遷移のたびにシェルが再マウントされない
  - ダッシュボードのウィジェットは Next.js Server Component として実装することで、クライアントサイドの fetch ボイラープレートを排除できる

---

## Research Log

### next-intl と App Router の統合方式

- **Context**: 多言語対応に next-intl を使用する。App Router との統合方式が複数存在し、選択が必要
- **Sources Consulted**: next-intl 公式ドキュメント（App Router 統合ガイド）
- **Findings**:
  - `[locale]` ディレクトリ方式: URL に `/ja/` `/en/` を含む（例: `/ja/dashboard`）。ロケールが URL で識別でき、SEO・シェアリンク・ブラウザ履歴が自然
  - Cookie/ヘッダー方式: URL は変わらず、ミドルウェアがロケールを注入。URLが変わらずシンプルだが、App Router の SSR キャッシュ管理が複雑になる
- **Implications**: `[locale]` ディレクトリ方式を採用。海外販社向けポータルでは URL の見やすさよりも、SSR との整合性と将来的な OGP 対応を優先する

### サイドバーの開閉状態管理

- **Context**: タブレット幅（768px–1279px）でサイドバーをアイコン表示またはコンパクト表示に切り替える要件がある
- **Findings**:
  - グローバル状態ライブラリ（Zustand 等）: ステアリングで「グローバル状態管理ライブラリは不要」と明示されているため除外
  - Context API: サイドバー開閉を複数コンポーネントで共有する場合に有効。ただし本仕様では AppShell が Header・Sidebar の両方を所有するため、`props down` で十分
  - `useState` in AppShell: AppShell が `isSidebarCollapsed` を保持し、Sidebar に `isCollapsed` prop として渡す。シンプルかつ要件を満たす
- **Implications**: `AppShell` の `useState` で管理し、`isCollapsed` を Sidebar へ props 渡し。レイアウトブレークポイントは Tailwind の `md:` / `lg:` クラスで制御する

### ダッシュボードウィジェットの fetch 戦略

- **Context**: モックAPIからデータを取得し、ローディング・エラー状態を表示する要件がある
- **Findings**:
  - Client Component + `useEffect`: クライアントサイドでの fetch。ローディング状態の管理が必要。フェーズ1では不要な複雑性
  - Server Component + `async/await`: ページレベルで await し、props でウィジェットに渡す。またはウィジェット自体を async Server Component にする
  - `Suspense` + Server Component streaming: ウィジェットごとに独立して非同期レンダリング。ローディングはSuspense fallbackで自然に対応できる
- **Implications**: ウィジェットを async Server Component として実装し、Next.js `Suspense` で囲む。フェーズ3の実API差し替え時も同一インターフェースで対応可能

---

## Architecture Pattern Evaluation

| オプション | 説明 | 強み | リスク・制限 | 備考 |
|---|---|---|---|---|
| Nested Layouts（採用） | `app/[locale]/layout.tsx` にAppShellを配置 | 全ページでシェルを再利用。ページ遷移でサイドバーが再マウントされない | ロケールプレフィックスのパス判定に注意 | Next.js App Router の推奨パターン |
| \_app.tsx ライク（Pages Router） | 全ページを共通ラッパーで包む | シンプル | App Router では非推奨 | 採用しない |
| Parallel Routes | Sidebar を並列ルートで管理 | 独立したローディング境界 | 複雑性が高く本件では過剰 | 採用しない |

---

## Design Decisions

### Decision: `[locale]` ルーティング方式の採用

- **Context**: next-intl の App Router 統合方式の選択
- **Alternatives Considered**:
  1. `[locale]` ディレクトリ方式 — URL に言語プレフィックスを含む（`/ja/`, `/en/`）
  2. Cookie/Headerのみ方式 — URLは変えずミドルウェアでロケール注入
- **Selected Approach**: `[locale]` ディレクトリ方式
- **Rationale**: App Router の SSR キャッシュと整合し、将来の SEO・ページシェアリング対応が容易。next-intl の公式推奨パターン
- **Trade-offs**: URLにロケールが含まれるため、内部リンクは next-intl の `Link` コンポーネント経由で書く必要がある
- **Follow-up**: ミドルウェアのデフォルトロケール（`ja`）へのリダイレクト動作を動作確認する

### Decision: ウィジェットを async Server Component で実装

- **Context**: ダッシュボードウィジェットのデータ取得とローディング状態管理
- **Alternatives Considered**:
  1. Client Component + `useEffect` — クライアントサイドfetch
  2. async Server Component + Suspense — サーバーサイドfetch
- **Selected Approach**: async Server Component + Suspense
- **Rationale**: フェーズ1ではモックAPIがほぼ同期的なため実質差は小さいが、フェーズ3での実API移行時にクライアントサイドの状態管理コードを追加せずに済む。Suspense fallbackがローディングUIの自然な実装場所となる
- **Trade-offs**: Server Component はクライアントフック（`useState` 等）が使えないため、インタラクティブ要素が必要な場合は Client Component への切り出しが必要
- **Follow-up**: フェーズ3でAPIレスポンス遅延が想定される場合、Suspense 境界を適切に設定すること

---

## Risks & Mitigations

- **アクティブナビゲーションのパス判定**: next-intl + App Routerでは `usePathname()` が `/ja/dashboard` のようにロケールプレフィックスを含む場合がある → `usePathname()` の戻り値とナビゲーション項目の `href` を比較する際にプレフィックス正規化を行う
- **翻訳キーの型安全性**: 翻訳キーをハードコードすると存在しないキーへのアクセスが実行時エラーになる → next-intl の TypeScript 型補完（`IntlMessages` 型）を設定し、コンパイル時に検出する
- **フェーズ3でのAPI型不整合**: モックAPIの型インターフェースが実APIと乖離すると差し替え時に大規模修正が発生する → `lib/api/` の型を `types/` に分離し、モックと実装で共通の型を参照する設計にする

---

## References

- next-intl App Router 統合ガイド（公式ドキュメント）
- Next.js Nested Layouts ドキュメント
- shadcn/ui Sidebar コンポーネントドキュメント
