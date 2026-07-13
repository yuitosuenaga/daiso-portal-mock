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
npm run db:seed
```

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
