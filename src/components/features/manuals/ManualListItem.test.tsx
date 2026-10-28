import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ManualListItem } from "@/components/features/manuals/ManualListItem";
import type { ManualSummary } from "@/types/manual";

const MANUAL: ManualSummary = {
  id: "manual-1",
  title: "テストマニュアル",
  description: "テスト用の説明文",
  sourceType: "upload",
  category: "storeOperations",
  year: 2026,
  month: 9,
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  targeting: { scope: "all" },
  translations: [],
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-01T09:00:00Z",
};

const GOOGLE_MANUAL: ManualSummary = {
  id: "manual-2",
  title: "Googleマニュアル",
  sourceType: "google",
  category: "accounting",
  year: 2026,
  month: 8,
  googleUrl: "https://docs.google.com/document/d/abc123/edit",
  googleEmbedUrl: "https://docs.google.com/document/d/abc123/preview",
  targeting: { scope: "all" },
  translations: [],
  createdAt: "2026-07-02T09:00:00Z",
  updatedAt: "2026-07-02T09:00:00Z",
};

const PROPS = {
  categoryLabel: "店舗運営",
  revisionLabel: "改訂年月",
  downloadLinkLabel: "ダウンロード",
  openOriginalLinkLabel: "元のドキュメントを開く",
};

describe("ManualListItem", () => {
  it("dataUrlを持たないデータで、iframeは配信URL・ダウンロードリンクは?download=1を指す", () => {
    render(<ManualListItem manual={MANUAL} {...PROPS} />);

    expect(screen.getByTitle("テストマニュアル").getAttribute("src")).toBe(
      "/api/manuals/manual-1/file"
    );
    const link = screen.getByText("ダウンロード");
    expect(link.getAttribute("href")).toBe("/api/manuals/manual-1/file?download=1");
    expect(link.getAttribute("download")).toBe("test.pdf");
    expect(screen.getByText("改訂年月: 2026/9")).toBeTruthy();
  });

  it("IDに特殊文字があってもURLエンコードする", () => {
    render(<ManualListItem manual={{ ...MANUAL, id: "a/b c" }} {...PROPS} />);
    expect(screen.getByTitle("テストマニュアル").getAttribute("src")).toBe(
      "/api/manuals/a%2Fb%20c/file"
    );
  });

  it("Google型は埋め込みURLをプレビューし、配信URLは使わない", () => {
    const { container } = render(<ManualListItem manual={GOOGLE_MANUAL} {...PROPS} />);

    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://docs.google.com/document/d/abc123/preview"
    );
    expect(container.innerHTML).not.toContain("/api/manuals/");
  });
});
