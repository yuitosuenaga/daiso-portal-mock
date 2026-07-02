import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("defaultバリアントはブランドカラー塗り・白文字のクラスを持つ", () => {
    render(<Badge variant="default">NEWS</Badge>);
    const badge = screen.getByText("NEWS");
    expect(badge.className).toContain("bg-primary");
    expect(badge.className).toContain("text-primary-foreground");
  });

  it("既存の用途別バリアントの見た目は変更されない", () => {
    render(<Badge variant="incident">障害</Badge>);
    const badge = screen.getByText("障害");
    expect(badge.className).toContain("bg-destructive");
    expect(badge.className).toContain("text-destructive-foreground");
  });
});
