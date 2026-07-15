import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api/links", () => ({
  createLink: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createLink, deleteLink, updateLink } from "@/lib/api/links";
import {
  createLinkAction,
  deleteLinkAction,
  updateLinkAction,
} from "@/lib/actions/links";
import type { CreateLinkInput, Link } from "@/types/link";

function buildInput(overrides: Partial<CreateLinkInput> = {}): CreateLinkInput {
  return {
    title: "社内ポータル",
    url: "https://example.com/portal",
    category: "internal",
    ...overrides,
  };
}

function link(overrides: Partial<Link> = {}): Link {
  return {
    id: "link-1",
    title: "タイトル",
    url: "https://example.com",
    category: "internal",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createLinkAction", () => {
  it("有効な入力でリンクを作成し、ルートを再検証する", async () => {
    vi.mocked(createLink).mockResolvedValue(link());

    const result = await createLinkAction(buildInput());

    expect(createLink).toHaveBeenCalled();
    expect(result.id).toBe("link-1");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("タイトルが空の不正な入力は例外になり、保存されない", async () => {
    await expect(createLinkAction(buildInput({ title: "" }))).rejects.toThrow();

    expect(createLink).not.toHaveBeenCalled();
  });

  it("不正なURL形式の入力は例外になり、保存されない", async () => {
    await expect(
      createLinkAction(buildInput({ url: "not-a-url" }))
    ).rejects.toThrow();

    expect(createLink).not.toHaveBeenCalled();
  });

  it("http(s)以外のスキームのURLは例外になり、保存されない", async () => {
    await expect(
      createLinkAction(buildInput({ url: "javascript:alert(1)" }))
    ).rejects.toThrow();

    expect(createLink).not.toHaveBeenCalled();
  });
});

describe("updateLinkAction / deleteLinkAction", () => {
  it("既存リンクを更新し、ルートを再検証する", async () => {
    vi.mocked(updateLink).mockResolvedValue(link({ title: "更新後" }));

    const result = await updateLinkAction("link-1", buildInput({ title: "更新後" }));

    expect(updateLink).toHaveBeenCalledWith(
      "link-1",
      expect.objectContaining({ title: "更新後" })
    );
    expect(result.title).toBe("更新後");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("不正な入力での更新は例外になり、保存されない", async () => {
    await expect(
      updateLinkAction("link-1", buildInput({ title: "" }))
    ).rejects.toThrow();

    expect(updateLink).not.toHaveBeenCalled();
  });

  it("既存リンクを削除し、ルートを再検証する", async () => {
    vi.mocked(deleteLink).mockResolvedValue(undefined);

    await deleteLinkAction("link-1");

    expect(deleteLink).toHaveBeenCalledWith("link-1");
    expect(revalidatePath).toHaveBeenCalled();
  });
});
