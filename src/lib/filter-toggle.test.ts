import { describe, expect, it } from "vitest";

import { toggleFilterPatch } from "@/lib/filter-toggle";

interface SampleFilters {
  status: string;
  urgency: string;
  unresolvedOnly: boolean;
}

const EMPTY: SampleFilters = { status: "", urgency: "", unresolvedOnly: false };

describe("toggleFilterPatch", () => {
  it("単一キーで現在値と異なる場合はpatchをそのまま適用する", () => {
    const current: SampleFilters = { ...EMPTY, status: "new" };
    const result = toggleFilterPatch(current, { status: "resolved" }, EMPTY);

    expect(result).toEqual({ status: "resolved" });
  });

  it("単一キーで現在値と同じ場合はそのキーを空値に戻す（従来互換）", () => {
    const current: SampleFilters = { ...EMPTY, status: "new" };
    const result = toggleFilterPatch(current, { status: "new" }, EMPTY);

    expect(result).toEqual({ status: "" });
  });

  it("複数キーが全て現在値と一致する場合は全キーを空値に戻す", () => {
    const current: SampleFilters = {
      ...EMPTY,
      unresolvedOnly: true,
      urgency: "high",
    };
    const result = toggleFilterPatch(
      current,
      { unresolvedOnly: true, urgency: "high" },
      EMPTY
    );

    expect(result).toEqual({ unresolvedOnly: false, urgency: "" });
  });

  it("複数キーのうち一部だけ現在値と一致する場合は解除せずpatchをそのまま適用する", () => {
    const current: SampleFilters = {
      ...EMPTY,
      unresolvedOnly: true,
      urgency: "medium",
    };
    const result = toggleFilterPatch(
      current,
      { unresolvedOnly: true, urgency: "high" },
      EMPTY
    );

    expect(result).toEqual({ unresolvedOnly: true, urgency: "high" });
  });

  it("複数キーが全て現在値と異なる場合はpatchをそのまま適用する", () => {
    const current: SampleFilters = EMPTY;
    const result = toggleFilterPatch(
      current,
      { unresolvedOnly: true, urgency: "high" },
      EMPTY
    );

    expect(result).toEqual({ unresolvedOnly: true, urgency: "high" });
  });
});
