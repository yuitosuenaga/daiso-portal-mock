import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * schema.prisma の外部キー列にインデックスが付いているかを静的に検査する。
 * Postgres は FK 列に自動でインデックスを作らないため、親側の削除・更新や JOIN が全表走査になる。
 * 意図的にインデックスを付けない FK はここに "Model.col" → 理由 で登録する。
 * 完全一致で比較するため、登録したのにインデックスが付いた（不要になった）エントリも失敗する。
 */
const ALLOWED_UNINDEXED_FKS: Record<string, string> = {};

type ModelInfo = { name: string; fks: string[][]; indexes: string[][] };

function splitCols(s: string): string[] {
  // sort: Desc, length: 10 等の引数内のカンマで分割しないよう、括弧部分を先に除去する
  return s
    .replace(/\([^)]*\)/g, "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

function parseSchema(schema: string): ModelInfo[] {
  const src = schema.replace(/\/\/.*$/gm, "");
  const models: ModelInfo[] = [];
  const modelRe = /^model (\w+) \{([\s\S]*?)^\}/gm;
  let m: RegExpExecArray | null;
  while ((m = modelRe.exec(src))) {
    const body = m[2];
    const fks: string[][] = [];
    const indexes: string[][] = [];
    const relRe = /@relation\([^)]*fields:\s*\[([^\]]+)\]/g;
    let r: RegExpExecArray | null;
    while ((r = relRe.exec(body))) fks.push(splitCols(r[1]));
    const idxRe = /@@(?:index|unique|id)\(\s*(?:fields:\s*)?\[([^\]]+)\]/g;
    while ((r = idxRe.exec(body))) indexes.push(splitCols(r[1]));
    for (const line of body.split("\n")) {
      const fm = /^\s*(\w+)\s+\S+.*@(?:id|unique)\b/.exec(line);
      if (fm && !/@relation/.test(line)) indexes.push([fm[1]]);
    }
    models.push({ name: m[1], fks, indexes });
  }
  return models;
}

function findUncoveredFks(models: ModelInfo[]): string[] {
  const out: string[] = [];
  for (const model of models) {
    for (const fk of model.fks) {
      const covered = model.indexes.some(
        (idx) => idx.length >= fk.length && fk.every((c, i) => idx[i] === c),
      );
      if (!covered) out.push(`${model.name}.${fk.join("+")}`);
    }
  }
  return out.sort();
}

describe("FK index parser", () => {
  it("2番目の列だけではカバー済みと判定しない", () => {
    const s = `model T {\n  id String @id\n  a String\n  b String\n  r R @relation(fields: [b], references: [id])\n  @@unique([a, b])\n}`;
    expect(findUncoveredFks(parseSchema(s))).toEqual(["T.b"]);
  });
  it("複合indexの先頭列・単一列@uniqueはカバー済み", () => {
    const s = `model T {\n  id String @id\n  a String @unique\n  b String\n  r R @relation(fields: [a], references: [id])\n  q R @relation(fields: [b], references: [id])\n  @@index([b, a])\n}`;
    expect(findUncoveredFks(parseSchema(s))).toEqual([]);
  });
  it("@@index(fields: [x], map: ..) の名前付き引数形式もカバー判定される", () => {
    const s = `model T {\n  id String @id\n  a String\n  r R @relation(fields: [a], references: [id])\n  @@index(fields: [a], map: "n")\n}`;
    expect(findUncoveredFks(parseSchema(s))).toEqual([]);
  });
  it("@@unique(fields: [a, b]) の先頭列aはカバー、bは未カバー", () => {
    const s = `model T {\n  id String @id\n  a String\n  b String\n  r R @relation(fields: [a], references: [id])\n  q R @relation(fields: [b], references: [id])\n  @@unique(fields: [a, b], map: "u")\n}`;
    expect(findUncoveredFks(parseSchema(s))).toEqual(["T.b"]);
  });
  it("@@id(fields: [..]) の先頭列はカバー判定される", () => {
    const s = `model T {\n  a String\n  b String\n  r R @relation(fields: [a], references: [id])\n  @@id(fields: [a, b])\n}`;
    expect(findUncoveredFks(parseSchema(s))).toEqual([]);
  });
  it("列のsort指定があっても列名を正しく取り出す", () => {
    const s = `model T {\n  id String @id\n  a String\n  b String\n  c String\n  r R @relation(fields: [a, b], references: [x, y])\n  q R @relation(fields: [c], references: [id])\n  @@index([a(sort: Desc, length: 10), b], type: BTree)\n}`;
    expect(findUncoveredFks(parseSchema(s))).toEqual(["T.c"]);
  });
  it("コメント内の記述は無視する", () => {
    const s = `model T {\n  id String @id\n  a String\n  r R @relation(fields: [a], references: [id])\n  // @@index([a])\n}`;
    expect(findUncoveredFks(parseSchema(s))).toEqual(["T.a"]);
  });
});

describe("prisma/schema.prisma", () => {
  const models = parseSchema(readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8"));

  it("FKを十分な数抽出できている", () => {
    expect(models.flatMap((x) => x.fks).length).toBeGreaterThanOrEqual(30);
  });
  it("DocumentCategory.parentId は複合index先頭列でカバー判定される", () => {
    const dc = models.find((x) => x.name === "DocumentCategory")!;
    expect(dc.fks).toContainEqual(["parentId"]);
    expect(dc.indexes.some((i) => i.length > 1 && i[0] === "parentId")).toBe(true);
    expect(findUncoveredFks([dc])).not.toContain("DocumentCategory.parentId");
  });
  it("インデックスの無いFK列が許可リストと完全一致する", () => {
    expect(findUncoveredFks(models)).toEqual(Object.keys(ALLOWED_UNINDEXED_FKS).sort());
  });
});
