/**
 * seed の実行前ガード。デモ用の既知パスワード（password1234）の admin アカウントを作るため、
 * 本番・Cloud SQL には絶対に投入させない。
 *
 * 次のいずれかに該当すると例外を投げる:
 * 1. `NODE_ENV=production`（上書き手段なし）
 * 2. `ALLOW_SEED` が `"1"` ではない（`"true"` 等は拒否）
 * 3. `DATABASE_URL` が Cloud SQL を指しているように見える
 *    （ローカルから Cloud SQL Auth Proxy 経由で本番URLを指定する事故の防止）
 */
export function assertSeedAllowed(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "seed を中止しました: NODE_ENV=production では seed を実行できません（上書き手段はありません）。本番には seed を投入しないでください。"
    );
  }

  if (env.ALLOW_SEED !== "1") {
    throw new Error(
      "seed を中止しました: ALLOW_SEED=1 が指定されていません。ローカル開発DBに投入する場合のみ `ALLOW_SEED=1 npm run db:seed` のように付けて実行してください（本番・Cloud SQL では実行しないこと。`.env` には書かないこと）。"
    );
  }

  if (looksLikeCloudSql(env.DATABASE_URL)) {
    throw new Error(
      "seed を中止しました: DATABASE_URL が Cloud SQL を指しているようです（`/cloudsql/` または `host=project:region:instance`）。seed はローカル開発DB専用です。"
    );
  }
}

function looksLikeCloudSql(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  if (databaseUrl.includes("/cloudsql/")) return true;

  const match = /[?&]host=([^&]*)/.exec(databaseUrl);
  if (!match) return false;
  let host = match[1];
  try {
    host = decodeURIComponent(host);
  } catch {
    // デコード不能ならそのまま判定する
  }
  // Cloud SQL のインスタンス接続名は `project:region:instance`（コロン2つ）
  return (host.match(/:/g) ?? []).length >= 2;
}
