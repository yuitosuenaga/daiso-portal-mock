# portal-mock

海外販社向け問い合わせ・お知らせポータル（Next.js App Router + Prisma + PostgreSQL）。プロジェクトの背景・技術構成は `.kiro/steering/`（`product.md` / `tech.md` / `structure.md`）を参照する。

前提: Node.js 20（`Dockerfile` は `node:20-bookworm-slim`）、Docker（ローカルの PostgreSQL 用）。

## Getting Started

### 1. 環境変数の準備

```bash
cp .env.example .env
```

必要であれば`.env`内の`AUTH_SECRET`をランダムな値に差し替える（`openssl rand -base64 32`等）。
`npm run build && npm run start`で本番相当（`NODE_ENV=production`）の動作確認をする場合、Auth.jsがHostヘッダーを検証するため`.env`の`AUTH_TRUST_HOST=true`が必要（`npm run dev`では不要）。

### 2. DB（PostgreSQL）の起動

```bash
docker compose up -d
```

DBeaverから確認する場合は、`.env`の`POSTGRES_*`の値（デフォルトはユーザー/パスワードとも`portal_mock`、ポート`5432`）で`localhost`に接続する。

### 3. マイグレーション・シードデータの投入

```bash
npx prisma migrate deploy
ALLOW_SEED=1 npm run db:seed
```

seed は誤投入防止のため `ALLOW_SEED=1` を付けないと中止する（`NODE_ENV=production` や Cloud SQL を指す `DATABASE_URL` では、フラグがあっても中止する）。

- ガードが防ぐのは Cloud SQL 形式のURL・`NODE_ENV=production`・フラグ忘れ（`.env` の `DATABASE_URL` も判定に使う）。Cloud SQL Auth Proxy 経由の `127.0.0.1` URL やIP直結は検出できないので、本番相当DBに向けた接続情報を `.env` / 環境変数に置かない運用が前提
- `ALLOW_SEED` は `.env` に書かない。実行のたびにコマンドへ付ける（`.env` に書くと常時有効になりガードが無意味になる）
- `npx prisma migrate reset` は seed を自動実行するため、`ALLOW_SEED=1 npx prisma migrate reset` と付ける（付けないとリセットは成功するが seed だけ失敗する）

シード投入後、以下のアカウントでログインできる（パスワードは共通で`password1234`）。

| ロール | ログインURL | メールアドレス |
|---|---|---|
| 申請者側企業ユーザー | `/ja/login` | `applicant@daiso-vietnam.example.com` |
| ヘルプデスク担当者 | `/ja/helpdesk/login` | `staff@helpdesk.example.com` |

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで <http://localhost:3000> を開く。

未ログインで保護されたページ（ダッシュボード・問い合わせ関連ページ等）にアクセスすると、それぞれのロールのログイン画面へリダイレクトされる。

## 開発コマンド

```bash
npm test          # vitest（単体テスト）
npm run lint      # next lint
npx tsc --noEmit  # 型チェック（typecheck 用の npm script は無い）
npm run build     # 本番ビルド
```

## ドキュメント

- `.kiro/steering/` — プロダクト概要・技術スタック・ディレクトリ構成
- `docs/infra/runbook.md` — リリース・バックアップ復旧・障害対応・機密値ローテーションの運用手順書
- `docs/infra/` — インフラ（Terraform、監視、CI・予算アラートなど）の計画・記録
- `CLAUDE.md` — 開発ルール（ブランチ運用・実装ワークフロー）

## デプロイ

現行環境（Cloud Run `portal-mock`）へのデプロイは、`.claude/commands/deploy-main.md`（`deploy-main`）と `docs/infra/runbook.md` §1 の手順に従う。マイグレーションを含む場合は、デプロイより先に本番 DB へ `prisma migrate deploy` を適用する。
