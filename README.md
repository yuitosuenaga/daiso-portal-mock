This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

未ログインで保護されたページ（ダッシュボード・問い合わせ関連ページ等）にアクセスすると、それぞれのロールのログイン画面へリダイレクトされる。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
