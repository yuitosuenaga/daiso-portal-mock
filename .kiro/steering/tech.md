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

- **モックアップ公開**: Cloud Run（`gcloud run deploy --source .` による手動デプロイ）
  - Firebase App Hostingはバックエンド作成時に必ずGitHubリポジトリ連携（Cloud Build GitHub Appのブラウザ認可）が必要になるため、GitHub連携なしで最小コスト・最小手順を優先し、Cloud Runへの直接デプロイを採用（2026-07-08変更）
  - リージョン: `asia-northeast1`、`min-instances=0`（アイドル時ゼロスケール）でコストを最小化
  - 更新時はmainマージ後に `gcloud run deploy` を再実行する運用（自動デプロイ・PRプレビューはなし）
- **バージョン管理**: GitHub（PRベース開発、main直push禁止）
- **CI**: GitHub Actions（lint / typecheck / build を将来的に整備。現フェーズでは lint・typecheck・build の確認を優先）

## 将来のバックエンド（フェーズ3以降・今は未実装）

| 項目 | 技術選定 |
|---|---|
| API | Node.js (TypeScript) または FastAPI（要検討、フロント確定後に決定） |
| DB | Cloud SQL for PostgreSQL |
| 自由記述の翻訳処理 | Google Cloud Translation API |

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
- レスポンシブはPC中心を基本としつつ、タブレット幅でも崩れないようにする（モバイル完全最適化は現フェーズでは不要）
