import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkifiedText } from "@/components/features/announcements/LinkifiedText";

describe("LinkifiedText", () => {
  it("URLを新規タブで開くリンクとして表示する", () => {
    render(
      <p>
        <LinkifiedText text="https://example.com/a を確認" />
      </p>
    );

    const link = screen.getByRole("link", { name: "https://example.com/a" });
    expect(link.getAttribute("href")).toBe("https://example.com/a");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("HTMLタグを含む本文をHTMLとして解釈せずテキストのまま表示する", () => {
    render(
      <p>
        <LinkifiedText text="<script>alert(1)</script> <b>x</b>" />
      </p>
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeTruthy();
  });
});
