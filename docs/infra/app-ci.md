# アプリコードの CI

作成日: 2026-10-28
関連: `docs/infra/ci-and-budget.md`(Terraform の CI と予算アラート)

リポジトリ `yuitosuenaga/daiso-portal-mock` は公開(PUBLIC)のため、標準ランナーは無料で使える。

## 1. ワークフロー一覧

| ファイル | ジョブ | 内容 | 必須チェック |
|---|---|---|---|
| `.github/workflows/ci.yml` | `verify` | `npm ci` → `prisma generate` → `tsc --noEmit` → `npm run lint` → `npm test`(TZ=Asia/Tokyo)→ `npm run build` | **はい** |
| 同上 | `integration` | postgres:16 の使い捨てコンテナに `prisma migrate deploy` で全マイグレーションを適用し、`vitest run integration --no-file-parallelism`(`helpdesk-staff-service` / `login-throttle` / `inquiry-service` / `monthly-material-service` / `email-normalization` / `company-service` の DB 結合テスト。staff テストが `deleteMany({})` で claim を消すためファイル並列は無効)を実行 | いいえ(安定後に追加を検討) |
| 同上 | `audit` | `npm audit --omit=dev --audit-level=high` | いいえ(新規脆弱性の公開で突然赤くなり得るため情報提供扱い) |
| `.github/workflows/docker-build.yml` | `docker-build` | `docker build --target runner .` と `--target migrate .`(push・ログイン・デプロイなし)。Dockerfile / package.json / prisma 等の変更時のみ | いいえ |
| `.github/workflows/terraform.yml` | `fmt` / `validate` / `plan` | `ci-and-budget.md` §2 を参照 | いいえ |

- `ci.yml` は `pull_request` と `main` への push で動く。必須チェックが「未実行」で止まらないよう paths フィルタは付けていない
- 権限は `contents: read` のみ。secrets は一切参照しない。`pull_request_target` は使わない。checkout は `persist-credentials: false`
- fork からの PR でも secrets 不要でそのまま動く(secrets が渡されない前提で設計している)。`pull_request_target` を使わないので、fork の PR コードが特権付きで実行されることはない
- Node のバージョンは `ci.yml` の `env.NODE_VERSION`(1か所)。Dockerfile の `node:20-bookworm-slim` と揃える
- `integration` の `prisma migrate deploy` は、CI 内の使い捨てコンテナ(ダミーのパスワード)に対するもの。本番 DB には接続しない

## 2. ブランチ保護(ユーザーが実行する)

Claude は設定しない。リポジトリ設定の変更になるため、ユーザーが行う。

### 事前確認

初回の CI 実行後、PR のチェック一覧に表示される名前(`verify`)を確認する。名前が異なる場合は下記の `context` を合わせる。

### gh api で設定する場合

```
gh api -X PUT repos/yuitosuenaga/daiso-portal-mock/branches/main/protection --input - <<'JSON'
{"required_status_checks":{"strict":false,"checks":[{"context":"verify"}]},
 "enforce_admins":true,"required_pull_request_reviews":null,"restrictions":null,
 "allow_force_pushes":false,"allow_deletions":false,"required_linear_history":false}
JSON
```

- `required_pull_request_reviews: null`(PR レビュー必須にしない)の理由: 所有者1人で、Claude が PR をマージする運用のため。レビュー必須にすると自分の PR を承認できずマージが止まる
- `enforce_admins: true` の理由: 管理者(所有者自身)でも CI が赤のままマージできないようにするため
- `strict: false` の理由: ブランチを main に追従していなくてもマージできるようにする(追従必須にすると毎回の再実行が増える)
- 緊急時に保護を外す場合は `gh api -X DELETE repos/yuitosuenaga/daiso-portal-mock/branches/main/protection`

### GUI で設定する場合

Settings > Branches > Add branch ruleset(または classic rule)で、対象 `main`、「Require status checks to pass」に `verify` を追加、「Do not allow bypassing the above settings」を有効にする。force push と削除は禁止のままにする。

### 併せて推奨する設定

- Settings > Actions > General > 「Fork pull request workflows from outside collaborators」を「Require approval for all outside collaborators」にする
- Settings > Actions > General > Workflow permissions を「Read repository contents and packages permissions」にする

### マージ前の確認

```
gh pr checks <PR番号> --required --watch
```

必須チェックが green になってからマージする。

## 3. Dependabot(`.github/dependabot.yml`)

- npm / github-actions / docker を毎週月曜(Asia/Tokyo)に確認する。`cooldown` 14日(公開直後のバージョンを避ける)、同時に開く PR は最大5件
- npm は production と development ごとに minor / patch を1つの PR にまとめる。major は個別 PR
- github-actions は minor / patch を1つにまとめ、major は個別 PR
- docker は node の major 更新を無視する(Node 22 への移行は別 PR で計画的に行う)
- Dockerfile は `ARG NODE_IMAGE=node:20-bookworm-slim` の形でイメージを指定しているため、Dependabot が検出しない可能性がある。初回実行後に Insights > Dependency graph > Dependabot で docker の検出状況を確認する
- Dependabot の PR も通常の PR と同じく CI が走る。**自動マージにするかどうかはユーザーが判断する事項**(既定では手動マージ)

## 4. actions の SHA 更新手順

workflow の actions はコミット SHA 固定(行末コメントにタグ)。Dependabot の github-actions 更新でも更新されるが、手動で更新する場合は次のとおり。

1. 公開から2週間以上経ったタグを選ぶ
   ```
   gh api repos/actions/checkout/releases --jq '.[:8][] | [.tag_name,.published_at,.prerelease]|@tsv'
   ```
2. タグを commit SHA に解決する
   ```
   gh api repos/actions/checkout/git/ref/tags/<tag> --jq '.object|[.type,.sha]|@tsv'
   ```
   `type` が `tag`(annotated tag)なら `gh api repos/actions/checkout/git/tags/<sha>` で `object.sha`(commit)まで辿る
3. `uses: actions/checkout@<SHA> # <tag>` の形で全 workflow を置き換える

現在の固定(2026-10-28 時点): `actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1`、`actions/setup-node` v7.1.0 = `949feb2413d6458794dcd2491c4babbbce0c15c1`。なお `terraform.yml` は checkout v4 系の SHA を使っており、本変更では触れていない。

## 5. CODEOWNERS(`.github/CODEOWNERS`)

`/.github/`、`/infra/`、`/prisma/` の所有者を `@yuitosuenaga` にしている。ブランチ保護で「コードオーナーのレビュー必須」を有効にしない限り、情報的な扱い(自動でレビュー依頼が付くだけ)。将来の共同作業者追加やクライアントへの移管に備えたもの。
