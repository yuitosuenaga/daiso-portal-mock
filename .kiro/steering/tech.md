# 技術スタック

## フロントエンド（現フェーズ）

| 項目 | 技術選定 |
|---|---|
| フレームワーク | Next.js (App Router) + TypeScript |
| スタイリング | Tailwind CSS + shadcn/ui |
| 多言語対応 | next-intl（初期実装言語: 日本語・英語） |
| フォームバリデーション | react-hook-form + zod |
| 状態管理 | React標準機能のみ（グローバル状態管理ライブラリは現時点で不要） |

## GCP環境について

- **使用するGoogle Cloudプロジェクト**: `rvp-ai-proto-camp`

## ホスティング

- **公開サービス**: Cloud Run サービス`portal-mock`（`gcloud run deploy --source .` による手動デプロイ）
  - Firebase App Hostingはバックエンド作成時に必ずGitHubリポジトリ連携（Cloud Build GitHub Appのブラウザ認可）が必要になるため、GitHub連携なしで最小コスト・最小手順を優先し、Cloud Runへの直接デプロイを採用（2026-07-08変更）
  - リージョン: `asia-northeast1`、`min-instances=0`（アイドル時ゼロスケール）でコストを最小化
  - IAM: `allUsers`にinvoker権限を付与し一般公開
- **バージョン管理**: GitHub（PRベース開発、main直push禁止）
- **CI**: GitHub Actions（lint / typecheck / build を将来的に整備。現フェーズでは lint・typecheck・build の確認を優先）

### バックエンド・DB版への統合（2026-07-13変更）

`spec/backend-db-foundation`ブランチでPostgreSQL・Prisma・Auth.jsによるバックエンド実装が完了し、検証用に別サービス`portal-mock-backend`で動作確認を行っていたが（2026-07-10〜）、動作確認が取れたためユーザーの指示により`portal-mock`（公開サービス）側に統合し、`portal-mock-backend`サービスは削除した。

- **デプロイ元**: `spec/backend-db-foundation`ブランチ（`origin/main`の最新をマージ済み）を、`main`へのGitマージを行わずに直接`gcloud run deploy --source .`で`portal-mock`へデプロイ
  - **重要**: これはCloud Runへのデプロイのみの変更であり、Gitの`main`ブランチはバックエンド未実装のままである。デプロイされている実体（`portal-mock`）とGit `main`の内容は乖離している。今後`main`に機能追加する際はこの乖離を踏まえて判断すること
  - Cursorレビュー未完了のまま、ユーザーの明示的な指示により本統合を実施（通常の機能PRレビュー運用の例外）
- **DB**: Cloud SQL for PostgreSQLインスタンス `portal-mock-backend-db`（`asia-northeast1`、最小構成）に`portal-mock`から接続。Cloud Run→Cloud SQLはCloud Run組み込みのCloud SQL Auth Proxy（`--add-cloudsql-instances`）経由、Unixソケット接続
- **秘匿値**: Secret Managerは使わず、`gcloud run deploy --set-env-vars`/`gcloud run services update --update-env-vars`でCloud Runの環境変数に直接設定（`DATABASE_URL`・`AUTH_SECRET`・`AUTH_TRUST_HOST`・`AUTH_URL`）
  - `AUTH_URL`はCloud Run経由のリクエストだとAuth.jsが内部ホスト（`localhost:8080`）を誤検出しログイン後リダイレクトが壊れるため、`portal-mock`の公開URLを明示的に設定している（2026-07-13追加）
- **コスト管理**: Cloud SQLインスタンスは`portal-mock`（公開サービス）の本番DBとなったため、停止すると公開サービスが使えなくなる。運用方針（常時起動に切り替えるか、引き続き`db-start`/`db-end`による手動起動・停止で運用するか）は2026-07-13時点で未確定・要相談。当面は従来通り手動運用を継続する

## バックエンド（`portal-mock`にデプロイ済み、Gitの`main`には未マージ）

`spec/backend-db-foundation`ブランチで以下を実装済みで、上記の通り`portal-mock`サービスにデプロイ済み。ただしGitの`main`ブランチにはまだマージされていない（上記「重要」参照）。

| 項目 | 技術選定 |
|---|---|
| API | Next.js Route Handlers / Server Actions（`src/app/api/`・`src/lib/actions/`） |
| 認証 | Auth.js（NextAuth）v5、Credentials Provider、JWTセッション |
| DB | Cloud SQL for PostgreSQL（Prisma ORM） |
| 自由記述の翻訳処理 | Google Cloud Translation API（未実装、引き続き将来対応） |

## 多言語対応方針

- UIのベース言語は **日本語・英語** から開始。他言語は `messages/` にJSONファイルを追加するだけで拡張できる構成にする
- 存在しない翻訳キーは英語にフォールバックする設定にする
- フォームの自由記述欄は「原文のまま送信」を前提とし、翻訳処理（Google Cloud Translation API連携）はフェーズ3で対応する
- 対象国が20か国以上に及ぶため、フォント表示崩れを防ぐよう `next/font` で多言語対応フォント（Noto Sans系）を必要に応じて追加できる構成にしておく
- 言語コードは ISO 639-1 で統一し、「国」と「言語」は別フィールドとして持つ

## コーディング規約・運用ルール

- 表示テキストは全て `next-intl` の翻訳キー経由で書く。JSX内に直接文字列をハードコードしない
- フォームは `react-hook-form` + `zod` を使用し、バリデーションルールを型と一体化させる
- API呼び出しは `lib/api/` にモック関数として抽象化し、将来的に実APIへ差し替えやすくする
- 機能追加は1機能ずつブランチを切り、PRを作成する（`main` への直接pushは行わない）
- 各PRで `npm run lint` / `npm run typecheck` / `npm run build` が通ることを確認する
- **実装完了時は必ず実機検証（ブラウザ）を行う**。UI変更・フォーム操作・表示制御を伴う機能では、静的レビュー・単体テストのみで完了とせず、ローカル開発サーバー（`npm run dev`）上で対象画面を実際に操作して受け入れ基準を確認する。多言語対応がある場合は日本語・英語の両ロケールで確認する
- レスポンシブはPC中心を基本としつつ、タブレット幅でも崩れないようにする（モバイル完全最適化は現フェーズでは不要）
