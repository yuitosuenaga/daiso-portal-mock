import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentCategoryCard } from "@/components/features/documents/DocumentCategoryCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("DocumentCategoryCard", () => {
  it("大分類名と件数表示ラベルを描画する", () => {
    render(
      <DocumentCategoryCard
        name="規程・マニュアル"
        documentCount={3}
        href="/documents/categories/cat-1"
        documentCountLabel="3件"
      />
    );

    expect(screen.getByText("規程・マニュアル")).toBeTruthy();
    expect(screen.getByText("3件")).toBeTruthy();
  });

  it("大分類配下一覧へのリンクとアクセシブルな名前を持つ", () => {
    render(
      <DocumentCategoryCard
        name="規程・マニュアル"
        documentCount={3}
        href="/documents/categories/cat-1"
        documentCountLabel="3件"
      />
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/documents/categories/cat-1");
    expect(link.getAttribute("aria-label")).toBe("規程・マニュアル. 3件");
  });
});
