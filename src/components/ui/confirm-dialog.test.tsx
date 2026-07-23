import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const labels = {
  triggerLabel: "削除",
  title: "削除しますか？",
  description: "『vn-daiso-vietnam』を削除しますか？この操作は取り消せません。",
  confirmLabel: "削除する",
  cancelLabel: "キャンセル",
};

describe("ConfirmDialog", () => {
  it("トリガー押下でモーダルが開き、titleとdescriptionが表示される", () => {
    render(<ConfirmDialog {...labels} onConfirm={vi.fn()} />);

    expect(screen.queryByText(labels.title)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));

    expect(screen.getByText(labels.title)).toBeTruthy();
    expect(screen.getByText(labels.description)).toBeTruthy();
  });

  it("確認ボタン押下でonConfirmが1回呼ばれる", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...labels} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));
    fireEvent.click(screen.getByRole("button", { name: labels.confirmLabel }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("onConfirmが成功すると自動的に閉じる", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmDialog {...labels} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));
    fireEvent.click(screen.getByRole("button", { name: labels.confirmLabel }));

    await waitFor(() => {
      expect(screen.queryByText(labels.title)).toBeNull();
    });
  });

  it("onConfirmが失敗した場合は閉じずに開いたままにする", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("failed"));
    render(<ConfirmDialog {...labels} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));
    fireEvent.click(screen.getByRole("button", { name: labels.confirmLabel }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText(labels.title)).toBeTruthy();
  });

  it("キャンセルボタン押下ではonConfirmを呼ばずに閉じる", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...labels} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));
    fireEvent.click(screen.getByRole("button", { name: labels.cancelLabel }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText(labels.title)).toBeNull();
  });

  it("Escapeキー押下ではonConfirmを呼ばずに閉じる", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...labels} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));
    fireEvent.keyDown(screen.getByText(labels.title), {
      key: "Escape",
      code: "Escape",
    });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText(labels.title)).toBeNull();
  });

  it("オーバーレイクリックではonConfirmを呼ばずに閉じる", async () => {
    const onConfirm = vi.fn();
    const { baseElement } = render(
      <ConfirmDialog {...labels} onConfirm={onConfirm} />
    );

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));
    const overlay = baseElement.querySelector(".backdrop-blur-sm");
    expect(overlay).toBeTruthy();

    // Radixのoutside-pointerdown検知はマウント後のマクロタスクでリスナー登録されるため待機する
    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.pointerDown(overlay as Element, { button: 0 });
    fireEvent.click(overlay as Element);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText(labels.title)).toBeNull();
  });

  it("isPending中は確認ボタンがdisabledになる", () => {
    render(<ConfirmDialog {...labels} onConfirm={vi.fn()} isPending />);

    fireEvent.click(screen.getByRole("button", { name: labels.triggerLabel }));

    const confirmButton = screen.getByRole("button", {
      name: labels.confirmLabel,
    }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
  });
});
