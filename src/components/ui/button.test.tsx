import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("defaultバリアントはブランドカラー塗りのクラスを持つ", () => {
    render(<Button>送信</Button>);
    const button = screen.getByRole("button", { name: "送信" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-primary-foreground");
  });

  it("outlineバリアントはブランドカラーの枠線・文字色を持ち、hoverで塗りに反転する", () => {
    render(<Button variant="outline">キャンセル</Button>);
    const button = screen.getByRole("button", { name: "キャンセル" });
    expect(button.className).toContain("border-primary");
    expect(button.className).toContain("text-primary");
    expect(button.className).toContain("hover:bg-primary");
    expect(button.className).toContain("hover:text-primary-foreground");
  });

  it("destructiveバリアントは警告色の枠線・文字色を持ち、hoverで塗りに反転する", () => {
    render(<Button variant="destructive">削除</Button>);
    const button = screen.getByRole("button", { name: "削除" });
    expect(button.className).toContain("border-destructive");
    expect(button.className).toContain("text-destructive");
    expect(button.className).toContain("hover:bg-destructive");
    expect(button.className).toContain("hover:text-destructive-foreground");
  });
});
