import { describe, expect, it } from "vitest";

import { formatTemplate } from "@/lib/format-template";

describe("formatTemplate", () => {
  it("単一のプレースホルダーを値に置き換える", () => {
    expect(formatTemplate("{count}社を登録しました", { count: 3 })).toBe(
      "3社を登録しました"
    );
  });

  it("複数のプレースホルダーをそれぞれの値に置き換える", () => {
    expect(
      formatTemplate("{companyCount}社・{userCount}件", {
        companyCount: 2,
        userCount: 10,
      })
    ).toBe("2社・10件");
  });

  it("同じプレースホルダーが複数回出現しても全て置き換える", () => {
    expect(formatTemplate("{count}, {count}", { count: 1 })).toBe("1, 1");
  });

  it("該当するプレースホルダーが無いときはテンプレートをそのまま返す", () => {
    expect(formatTemplate("plain text", { count: 1 })).toBe("plain text");
  });

  it("文字列値もそのまま置き換える", () => {
    expect(formatTemplate("Select {name}", { name: "Daiso Thailand" })).toBe(
      "Select Daiso Thailand"
    );
  });
});
