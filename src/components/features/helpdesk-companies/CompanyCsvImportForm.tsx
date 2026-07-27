"use client";

import { useId, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatTemplate } from "@/lib/format-template";
import {
  importCompaniesAction,
  type CompanyCsvImportResult,
} from "@/lib/actions/companies";
import type { CompanyCsvRowErrorCode } from "@/lib/company-csv";

export interface CompanyCsvImportFormProps {
  fileInputLabel: string;
  uploadButtonLabel: string;
  uploadingLabel: string;
  resultsHeading: string;
  rowNumberHeader: string;
  rowNameHeader: string;
  rowCompanyCodeHeader: string;
  rowStatusHeader: string;
  rowErrorsHeader: string;
  statusOkLabel: string;
  statusErrorLabel: string;
  /** 成功時メッセージのテンプレート。`{count}`を実際の登録件数に置き換えて表示する。 */
  successMessageTemplate: string;
  noFileSelectedMessage: string;
  genericErrorMessage: string;
  /** 行別エラーコードごとの表示文言。 */
  errorMessages: Record<CompanyCsvRowErrorCode, string>;
  /** ファイル全体エラーコードごとの表示文言。 */
  fileErrorMessages: Record<string, string>;
}

/**
 * CSVファイルを選択→`importCompaniesAction`呼び出し→行別検証結果テーブル表示を行う
 * Client Component（要件19.1, 19.3, 19.8, 19.11, 19.12）。全行成功時のみ登録が行われ、
 * 成功メッセージを表示する。エラーがある場合は登録を行わず、行別のエラー内容を表示する。
 */
export function CompanyCsvImportForm({
  fileInputLabel,
  uploadButtonLabel,
  uploadingLabel,
  resultsHeading,
  rowNumberHeader,
  rowNameHeader,
  rowCompanyCodeHeader,
  rowStatusHeader,
  rowErrorsHeader,
  statusOkLabel,
  statusErrorLabel,
  successMessageTemplate,
  noFileSelectedMessage,
  genericErrorMessage,
  errorMessages,
  fileErrorMessages,
}: CompanyCsvImportFormProps) {
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CompanyCsvImportResult | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
    setValidationMessage(null);
  }

  /**
   * ファイルをUTF-8テキストとして読み込む。`Blob.text()`はjsdom等の一部環境で
   * 未実装のため、より互換性の高い`FileReader.readAsText`を用いる。
   */
  function readFileAsText(target: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("failed to read file"));
      reader.readAsText(target, "utf-8");
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationMessage(null);

    if (!file) {
      setValidationMessage(noFileSelectedMessage);
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const csvText = await readFileAsText(file);
      const actionResult = await importCompaniesAction(csvText);
      setResult(actionResult);
    } catch {
      setValidationMessage(genericErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-1">
          <Label htmlFor={fileInputId}>{fileInputLabel}</Label>
          <input
            id={fileInputId}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? uploadingLabel : uploadButtonLabel}
          </Button>
        </div>

        {validationMessage && (
          <p role="status" className="text-sm text-destructive">
            {validationMessage}
          </p>
        )}
      </form>

      {result?.fileError && (
        <p role="status" className="text-sm text-destructive">
          {fileErrorMessages[result.fileError] ?? result.fileError}
        </p>
      )}

      {result?.committed && (
        <p role="status" className="text-sm text-foreground">
          {formatTemplate(successMessageTemplate, { count: result.createdCount })}
        </p>
      )}

      {result && !result.fileError && result.rows.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              {resultsHeading}
            </h2>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{rowNumberHeader}</th>
                  <th className="py-2 pr-4 font-medium">{rowNameHeader}</th>
                  <th className="py-2 pr-4 font-medium">{rowCompanyCodeHeader}</th>
                  <th className="py-2 pr-4 font-medium">{rowStatusHeader}</th>
                  <th className="py-2 pr-4 font-medium">{rowErrorsHeader}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="py-3 pr-4 text-muted-foreground">{row.rowNumber}</td>
                    <td className="py-3 pr-4 font-medium text-foreground">{row.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.companyCode}
                    </td>
                    <td className="py-3 pr-4">
                      {row.status === "ok" ? (
                        <span className="text-foreground">{statusOkLabel}</span>
                      ) : (
                        <span className="text-destructive">{statusErrorLabel}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.errors
                        .map(
                          (code) =>
                            errorMessages[code as CompanyCsvRowErrorCode] ?? code
                        )
                        .join("、")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
