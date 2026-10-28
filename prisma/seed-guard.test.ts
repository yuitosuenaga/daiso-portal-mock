import { describe, expect, it } from "vitest";

import { assertSeedAllowed } from "./seed-guard";

const LOCAL_URL = "postgresql://portal_mock:portal_mock@localhost:5432/portal_mock";

function env(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...overrides } as NodeJS.ProcessEnv;
}

describe("assertSeedAllowed", () => {
  it("ALLOW_SEED=1 かつローカルURLなら許可する", () => {
    expect(() => assertSeedAllowed(env({ ALLOW_SEED: "1", DATABASE_URL: LOCAL_URL }))).not.toThrow();
  });

  it("NODE_ENV=development でも ALLOW_SEED=1 なら許可する", () => {
    expect(() =>
      assertSeedAllowed(env({ ALLOW_SEED: "1", NODE_ENV: "development", DATABASE_URL: LOCAL_URL }))
    ).not.toThrow();
  });

  it("DATABASE_URL 未設定でも ALLOW_SEED=1 なら許可する（接続自体は Prisma 側で失敗する）", () => {
    expect(() => assertSeedAllowed(env({ ALLOW_SEED: "1" }))).not.toThrow();
  });

  it("NODE_ENV=production は ALLOW_SEED=1 でも拒否する", () => {
    expect(() =>
      assertSeedAllowed(env({ ALLOW_SEED: "1", NODE_ENV: "production", DATABASE_URL: LOCAL_URL }))
    ).toThrow(/production/);
  });

  it("ALLOW_SEED 未設定は拒否し、付け方をメッセージに含める", () => {
    expect(() => assertSeedAllowed(env({ DATABASE_URL: LOCAL_URL }))).toThrow(/ALLOW_SEED=1/);
  });

  it('ALLOW_SEED="true" は拒否する', () => {
    expect(() => assertSeedAllowed(env({ ALLOW_SEED: "true", DATABASE_URL: LOCAL_URL }))).toThrow(
      /ALLOW_SEED/
    );
  });

  it('ALLOW_SEED="0" と空文字は拒否する', () => {
    expect(() => assertSeedAllowed(env({ ALLOW_SEED: "0" }))).toThrow();
    expect(() => assertSeedAllowed(env({ ALLOW_SEED: "" }))).toThrow();
  });

  it("DATABASE_URL に /cloudsql/ を含むなら拒否する", () => {
    expect(() =>
      assertSeedAllowed(
        env({ ALLOW_SEED: "1", DATABASE_URL: "postgresql://u:p@/db?host=/cloudsql/proj:asia-northeast1:inst" })
      )
    ).toThrow(/Cloud SQL/);
  });

  it("host= に project:region:instance 形式があれば拒否する", () => {
    expect(() =>
      assertSeedAllowed(
        env({ ALLOW_SEED: "1", DATABASE_URL: "postgresql://u:p@localhost/db?host=/tmp/x/proj:asia-northeast1:inst" })
      )
    ).toThrow(/Cloud SQL/);
  });

  it("host= がコロン1つ以下（ローカルソケット等）なら許可する", () => {
    expect(() =>
      assertSeedAllowed(env({ ALLOW_SEED: "1", DATABASE_URL: "postgresql://u:p@localhost/db?host=/var/run/postgresql" }))
    ).not.toThrow();
  });

  it("通常のポート指定のホストはコロンがあっても許可する", () => {
    expect(() =>
      assertSeedAllowed(env({ ALLOW_SEED: "1", DATABASE_URL: "postgresql://u:p@127.0.0.1:5433/db" }))
    ).not.toThrow();
  });
});
