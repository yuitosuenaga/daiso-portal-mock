import { Document, CreateDocumentInput } from "@/types/document";
import { getGlobalMockStore } from "@/lib/mock-store";
import { MOCK_CURRENT_COMPANY } from "@/lib/constants/current-company";

/**
 * フェーズ1のモックシード用PDF（1ページ、"Sample Document PDF"とだけ描画される最小限のPDF）。
 * 実ファイルストレージが無いため、Base64データURLとしてハードコードする。
 */
const SAMPLE_PDF_DATA_URL =
  "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK";

/**
 * ドキュメントの可変ストア。Server Actionsからの変更がRSCレンダリングに反映されるよう、
 * `globalThis`上に保持する（`lib/mock-store.ts`参照）。
 */
const MOCK_DOCUMENTS: Document[] = getGlobalMockStore("documents", () => [
  {
    id: "1",
    title: "店舗運営マニュアル（共通版）",
    description: "全販社共通の店舗運営における基本ルールをまとめたマニュアルです。",
    fileName: "store-operations-manual.pdf",
    fileType: "application/pdf",
    fileSize: 245_760,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "all" },
    uploadedAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "2",
    title: "商品陳列ガイドライン（東南アジア版）",
    description: "東南アジア地域向けの商品陳列レイアウトのガイドラインです。",
    fileName: "merchandising-guideline-sea.pdf",
    fileType: "application/pdf",
    fileSize: 512_000,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "countries", countries: ["VN", "TH", "ID"] },
    uploadedAt: "2026-06-25T09:00:00Z",
  },
  {
    id: "3",
    title: "レジ操作マニュアル（ベトナム限定）",
    description: "ベトナム販社向けのレジ端末操作手順をまとめた資料です。",
    fileName: "pos-manual-vietnam.pdf",
    fileType: "application/pdf",
    fileSize: 189_440,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "companies", companyCodes: ["vn-daiso-vietnam"] },
    uploadedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "4",
    title: "内部監査資料（本部限定）",
    description: "日本本部限定の内部監査に関する資料です。",
    fileName: "internal-audit-hq-only.pdf",
    fileType: "application/pdf",
    fileSize: 1_048_576,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "companies", companyCodes: ["jp-daiso-japan-trading"] },
    uploadedAt: "2026-06-15T09:00:00Z",
  },
  {
    id: "5",
    title: "什器組み立て手順書（北米向け）",
    description: "北米地域向け店舗什器の組み立て手順をまとめた資料です。",
    fileName: "fixture-assembly-us.pdf",
    fileType: "application/pdf",
    fileSize: 358_400,
    dataUrl: SAMPLE_PDF_DATA_URL,
    targeting: { scope: "countries", countries: ["US"] },
    uploadedAt: "2026-06-10T09:00:00Z",
  },
]);

function isVisibleToCurrentCompany(document: Document): boolean {
  switch (document.targeting.scope) {
    case "all":
      return true;
    case "countries":
      return document.targeting.countries.includes(MOCK_CURRENT_COMPANY.country);
    case "companies":
      return document.targeting.companyCodes.includes(
        MOCK_CURRENT_COMPANY.companyCode
      );
  }
}

function sortByUploadedAtDesc(documents: Document[]): Document[] {
  return [...documents].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

/**
 * 自社（`MOCK_CURRENT_COMPANY`）に公開範囲が及ぶドキュメント全件をアップロード日の降順で返す。
 */
export async function getDocuments(): Promise<Document[]> {
  const visible = MOCK_DOCUMENTS.filter(isVisibleToCurrentCompany);

  return Promise.resolve(sortByUploadedAtDesc(visible));
}

/**
 * 指定したIDのドキュメントを1件返す。自社に公開範囲が及ばない、または該当データが
 * 存在しない場合はnullを解決する。
 */
export async function getDocumentById(id: string): Promise<Document | null> {
  const found = MOCK_DOCUMENTS.find(
    (item) => item.id === id && isVisibleToCurrentCompany(item)
  );

  return Promise.resolve(found ?? null);
}

/**
 * 公開範囲による絞り込みを行わず、ドキュメント全件をアップロード日の降順で返す
 * モックAPI関数。ヘルプデスク側のドキュメント管理画面が利用する。
 */
export async function getAllDocuments(): Promise<Document[]> {
  return Promise.resolve(sortByUploadedAtDesc(MOCK_DOCUMENTS));
}

/**
 * 公開範囲による絞り込みを行わず、指定したIDのドキュメントを1件返すモックAPI関数。
 * ヘルプデスク側の編集画面が利用する。該当データが存在しない場合はnullを解決する。
 */
export async function getDocumentByIdForHelpdesk(
  id: string
): Promise<Document | null> {
  const found = MOCK_DOCUMENTS.find((item) => item.id === id);

  return Promise.resolve(found ?? null);
}

/**
 * ドキュメントを新規作成するモックAPI関数。アップロード日時は保存操作を行った時刻とする。
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<Document> {
  const document: Document = {
    id: crypto.randomUUID(),
    uploadedAt: new Date().toISOString(),
    ...input,
  };

  MOCK_DOCUMENTS.push(document);

  return Promise.resolve(document);
}

/**
 * 既存ドキュメントの内容を更新するモックAPI関数。
 */
export async function updateDocument(
  id: string,
  input: CreateDocumentInput
): Promise<Document> {
  const document = MOCK_DOCUMENTS.find((item) => item.id === id);
  if (!document) {
    throw new Error(`Document not found: ${id}`);
  }

  document.title = input.title;
  document.description = input.description;
  document.fileName = input.fileName;
  document.fileType = input.fileType;
  document.fileSize = input.fileSize;
  document.dataUrl = input.dataUrl;
  document.targeting = input.targeting;

  return Promise.resolve(document);
}

/**
 * ドキュメントを削除するモックAPI関数。
 */
export async function deleteDocument(id: string): Promise<void> {
  const index = MOCK_DOCUMENTS.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Document not found: ${id}`);
  }

  MOCK_DOCUMENTS.splice(index, 1);

  return Promise.resolve();
}
