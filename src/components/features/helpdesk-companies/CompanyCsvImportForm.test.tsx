import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyCsvImportForm } from "@/components/features/helpdesk-companies/CompanyCsvImportForm";
import type { CompanyCsvImportResult } from "@/lib/actions/companies";

const importCompaniesActionMock = vi.fn();

vi.mock("@/lib/actions/companies", () => ({
  importCompaniesAction: (...args: unknown[]) => importCompaniesActionMock(...args),
}));

const props = {
  fileInputLabel: "CSVファイルを選択",
  uploadButtonLabel: "検証してアップロード",
  uploadingLabel: "検証中…",
  resultsHeading: "検証結果",
  rowNumberHeader: "行番号",
  rowNameHeader: "会社名",
  rowCompanyCodeHeader: "販社コード",
  rowStatusHeader: "判定",
  rowErrorsHeader: "エラー内容",
  statusOkLabel: "登録可",
  statusErrorLabel: "エラー",
  successMessageTemplate: "{count}社を登録しました",
  noFileSelectedMessage: "CSVファイルを選択してください",
  genericErrorMessage: "検証・登録に失敗しました。時間を置いて再度お試しください。",
  errorMessages: {
    required: "会社名・国・販社コードは必須です",
    companyCodeFormat: "販社コードの形式が正しくありません",
    invalidCountry: "国コードが不正です",
    companyCodeDuplicate: "この販社コードは既に登録されています",
    duplicateInFile: "このCSV内で販社コードが重複しています",
  },
  fileErrorMessages: {
    empty: "CSVファイルが空です",
    headerMismatch: "ヘッダー行が一致しません",
    noDataRows: "データ行が0件です",
  },
};

function csvFile(content: string, name = "companies.csv"): File {
  const file = new File([content], name, { type: "text/csv" });
  // jsdomのFile.text()はNode環境でも利用可能だが、念のためBlobベースの実装を明示する。
  return file;
}

beforeEach(() => {
  importCompaniesActionMock.mockReset();
});

describe("CompanyCsvImportForm", () => {
  it("ファイル未選択でアップロードするとimportCompaniesActionを呼び出さず案内を表示する", async () => {
    render(<CompanyCsvImportForm {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "検証してアップロード" }));

    await waitFor(() => {
      expect(screen.getByText("CSVファイルを選択してください")).toBeTruthy();
    });
    expect(importCompaniesActionMock).not.toHaveBeenCalled();
  });

  it("全行成功時、成功メッセージと行別結果テーブルを表示する（要件19.11）", async () => {
    const result: CompanyCsvImportResult = {
      committed: true,
      createdCount: 2,
      rows: [
        {
          rowNumber: 1,
          name: "Daiso Thailand",
          country: "TH",
          companyCode: "th-daiso-thailand",
          status: "ok",
          errors: [],
        },
        {
          rowNumber: 2,
          name: "Daiso Vietnam",
          country: "VN",
          companyCode: "vn-daiso-vietnam",
          status: "ok",
          errors: [],
        },
      ],
    };
    importCompaniesActionMock.mockResolvedValue(result);

    render(<CompanyCsvImportForm {...props} />);

    const file = csvFile(
      "name,country,companyCode\nDaiso Thailand,TH,th-daiso-thailand\nDaiso Vietnam,VN,vn-daiso-vietnam"
    );
    const input = screen.getByLabelText("CSVファイルを選択") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "検証してアップロード" }));

    await waitFor(() => {
      expect(screen.getByText("2社を登録しました")).toBeTruthy();
    });
    expect(screen.getByText("Daiso Thailand")).toBeTruthy();
    expect(screen.getAllByText("登録可").length).toBe(2);
  });

  it("一部行にエラーがある場合、登録は行われず行別エラー内容を表示する（要件19.9）", async () => {
    const result: CompanyCsvImportResult = {
      committed: false,
      createdCount: 0,
      rows: [
        {
          rowNumber: 1,
          name: "Daiso Thailand",
          country: "TH",
          companyCode: "th-daiso-thailand",
          status: "ok",
          errors: [],
        },
        {
          rowNumber: 2,
          name: "Daiso Bad",
          country: "XX",
          companyCode: "bad_code",
          status: "error",
          errors: ["invalidCountry", "companyCodeFormat"],
        },
      ],
    };
    importCompaniesActionMock.mockResolvedValue(result);

    render(<CompanyCsvImportForm {...props} />);

    const file = csvFile("name,country,companyCode\nDaiso Bad,XX,bad_code");
    const input = screen.getByLabelText("CSVファイルを選択") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "検証してアップロード" }));

    await waitFor(() => {
      expect(screen.getByText("エラー")).toBeTruthy();
    });
    expect(screen.queryByText(/社を登録しました/)).toBeNull();
    expect(
      screen.getByText("国コードが不正です、販社コードの形式が正しくありません")
    ).toBeTruthy();
  });

  it("ファイル全体エラー（ヘッダー不一致等）はfileErrorメッセージを表示する（要件19.12）", async () => {
    importCompaniesActionMock.mockResolvedValue({
      committed: false,
      createdCount: 0,
      rows: [],
      fileError: "headerMismatch",
    } satisfies CompanyCsvImportResult);

    render(<CompanyCsvImportForm {...props} />);

    const file = csvFile("name,country\nDaiso Thailand,TH");
    const input = screen.getByLabelText("CSVファイルを選択") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "検証してアップロード" }));

    await waitFor(() => {
      expect(screen.getByText("ヘッダー行が一致しません")).toBeTruthy();
    });
  });

  it("action呼び出しが例外を投げた場合は汎用エラーメッセージを表示する", async () => {
    importCompaniesActionMock.mockRejectedValue(new Error("network error"));

    render(<CompanyCsvImportForm {...props} />);

    const file = csvFile("name,country,companyCode\nDaiso Thailand,TH,th-daiso-thailand");
    const input = screen.getByLabelText("CSVファイルを選択") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "検証してアップロード" }));

    await waitFor(() => {
      expect(
        screen.getByText("検証・登録に失敗しました。時間を置いて再度お試しください。")
      ).toBeTruthy();
    });
  });
});
