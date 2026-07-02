import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, AlertDescription } from "@/components/ui/alert";

describe("Alert", () => {
  it("noticeバリアントはブランドカラー塗り・白文字の通知帯として表示される", () => {
    render(
      <Alert variant="notice">
        <AlertDescription>重要なお知らせ</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("bg-primary");
    expect(alert.className).toContain("text-primary-foreground");
  });

  it("既存のsuccess/destructiveバリアントの見た目は変更されない", () => {
    render(
      <Alert variant="destructive">
        <AlertDescription>エラー</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("border-destructive/50");
    expect(alert.className).toContain("text-destructive");
  });
});
