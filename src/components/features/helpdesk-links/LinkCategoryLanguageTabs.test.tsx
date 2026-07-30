import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LinkCategoryLanguageTabs } from "@/components/features/helpdesk-links/LinkCategoryLanguageTabs";
import {
  linkCategoryFormSchema,
  type LinkCategoryFormValues,
} from "@/lib/validation/link-category";

const MESSAGES: Record<string, string> = {
  jaTab: "日本語",
  enTab: "English",
  addButton: "言語を追加",
  removeButton: "この言語を削除",
  localeCodeLabel: "言語コード",
  localeCodePlaceholder: "例: th, vi, zh",
  localeDuplicateError: "他の言語と重複しない言語コードを入力してください",
  nameLabel: "名称",
  namePlaceholder: "カテゴリ名を入力してください",
  required: "この項目は必須です",
};

function Harness({ defaultValues }: { defaultValues: LinkCategoryFormValues }) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<LinkCategoryFormValues>({
    resolver: zodResolver(linkCategoryFormSchema),
    defaultValues,
  });

  return (
    <LinkCategoryLanguageTabs
      register={register}
      control={control}
      watch={watch}
      errors={errors}
    />
  );
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    if (namespace === "inquiryForm") {
      return key === "requiredMark" ? "*" : key;
    }
    const shortKey = key.startsWith("language.") ? key.replace("language.", "") : key;
    return MESSAGES[shortKey] ?? key;
  },
}));

describe("LinkCategoryLanguageTabs", () => {
  it("既定でjaタブが選択され、名称入力欄を表示する", () => {
    render(
      <Harness
        defaultValues={{ parentId: null, name: "", nameEn: "", translations: [] }}
      />
    );

    expect(
      screen.getByRole("tab", { name: "日本語" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByLabelText(/^名称/)).toBeTruthy();
  });

  it("enタブへ切り替えると英語名称入力欄を表示する", () => {
    render(
      <Harness
        defaultValues={{ parentId: null, name: "", nameEn: "", translations: [] }}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "English" }));

    expect(
      screen.getByRole("tab", { name: "English" }).getAttribute("aria-selected")
    ).toBe("true");
  });

  it("「言語を追加」を押すと追加言語タブが増え、そのタブへ自動的に切り替わる", () => {
    render(
      <Harness
        defaultValues={{ parentId: null, name: "", nameEn: "", translations: [] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "言語を追加" }));

    expect(screen.getByLabelText(/^言語コード/)).toBeTruthy();
  });

  it("追加言語タブで「この言語を削除」を押すとタブが消え、jaタブへ戻る", () => {
    render(
      <Harness
        defaultValues={{ parentId: null, name: "", nameEn: "", translations: [] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "言語を追加" }));
    fireEvent.click(screen.getByRole("button", { name: "この言語を削除" }));

    expect(
      screen.getByRole("tab", { name: "日本語" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.queryByLabelText(/^言語コード/)).toBeNull();
  });
});
