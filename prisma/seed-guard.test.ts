import { describe, expect, it } from "vitest";

import { assertSeedAllowed, loadDotEnvForGuard } from "./seed-guard";

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

describe("loadDotEnvForGuard", () => {
  it("ファイルが無い（ENOENT）場合は無視する", () => {
    const loader = () => {
      throw Object.assign(new Error("no such file"), { code: "ENOENT" });
    };
    expect(() => loadDotEnvForGuard(loader)).not.toThrow();
  });

  it("ENOENT 以外のエラーは再送出する", () => {
    const loader = () => {
      throw Object.assign(new Error("bad"), { code: "EACCES" });
    };
    expect(() => loadDotEnvForGuard(loader)).toThrow(/bad/);
  });

  it(".env にだけ書かれた Cloud SQL 形式の DATABASE_URL をガードが検出する", () => {
    const saved = { ...process.env };
    try {
      delete process.env.DATABASE_URL;
      process.env.ALLOW_SEED = "1";
      loadDotEnvForGuard((path) => {
        if (path === ".env") {
          process.env.DATABASE_URL = "postgresql://u:p@localhost/x?host=/cloudsql/p:r:i";
        }
      });
      expect(() => assertSeedAllowed(process.env)).toThrow(/Cloud SQL/);
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    }
  });
});
