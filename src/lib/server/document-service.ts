import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { PdfFileStats } from "@/lib/server/file-response";
import {
  DEFAULT_DOCUMENT_LOCALE,
  DOCUMENT_FILE_SELECT,
  DOCUMENT_INCLUDE,
  DOCUMENT_SUMMARY_SELECT,
  mapDocument,
  mapDocumentSummary,
  resolveDocumentContent,
  targetingToColumns,
} from "@/lib/server/document-mapper";
import type { CreateDocumentInput, Document, DocumentSummary } from "@/types/document";

// `resolveDocumentContent`は`document-mapper.ts`から再エクスポートし、
// `document-mapper.ts`に依存する呼び出し元が本モジュール経由でも参照できるようにする
// （`announcement-service.ts`の`resolveAnnouncementContent`再エクスポートと同型）。
export { resolveDocumentContent };

export class DocumentNotFoundError extends Error {
  readonly documentId: string;

  constructor(documentId: string) {
    super("Document not found");
    this.name = "DocumentNotFoundError";
    this.documentId = documentId;
  }
}

const ORDER_BY_UPLOADED_AT_DESC = { uploadedAt: "desc" } as const;

/**
 * `CreateDocumentInput`をPrismaの書き込み用データへ変換する。`sourceType`の分岐で
 * 使われない側のフィールド（アップロード方式ならgoogleUrl/googleEmbedUrl、Google方式なら
 * fileName等）は明示的に`null`にし、編集時に登録方式が切り替わっても前の方式のデータが
 * 残留しないようにする。
 */
function toDocumentData(input: CreateDocumentInput): Prisma.DocumentUncheckedCreateInput {
  const targetingColumns = targetingToColumns(input.targeting);

  if (input.sourceType === "google") {
    return {
      title: input.title,
      description: input.description,
      status: input.status,
      sourceType: "google",
      fileName: null,
      fileType: null,
      fileSize: null,
      dataUrl: null,
      googleUrl: input.googleUrl,
      googleEmbedUrl: input.googleEmbedUrl,
      categoryId: input.categoryId,
      subCategoryId: input.subCategoryId,
      ...targetingColumns,
    };
  }

  return {
    title: input.title,
    description: input.description,
    status: input.status,
    sourceType: "upload",
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    dataUrl: input.dataUrl,
    googleUrl: null,
    googleEmbedUrl: null,
    categoryId: input.categoryId,
    subCategoryId: input.subCategoryId,
    ...targetingColumns,
  };
}

/**
 * ドキュメントの可視性述語（公開済み ＋ 公開範囲が自社に及ぶ）。カテゴリサービス
 * （`document-category-service.ts`）が「配下に自社可視の公開済みドキュメントが1件以上」
 * （要件21.6）を判定する際にもこの述語をそのまま再利用し、同じ条件を2箇所に書かない。
 */
export function documentVisibleToWhere(
  country: string,
  companyCode: string
): Prisma.DocumentWhereInput {
  return {
    status: "published",
    OR: [
      { targetingScope: "all" },
      { targetingScope: "countries", targetingCountries: { has: country } },
      { targetingScope: "companies", targetingCompanyCodes: { has: companyCode } },
    ],
  };
}

/**
 * `translations`配列（`en`必須＋任意追加言語）をPrismaのネスト書き込み形状に変換する。
 * `en`行を必ず1件含み、それ以外の行は渡された内容で全置換する方針のため、常に
 * `deleteMany`（既存の全翻訳行を削除）＋`create`（渡された内容を作り直す）で表現する
 * （`announcement-service.ts`の`translationsToNestedWrite`と同型）。
 */
function translationsToNestedWrite(translations: Document["translations"]) {
  return {
    deleteMany: {},
    create: translations.map((translation) => ({
      locale: translation.locale,
      title: translation.title,
      description: translation.description,
    })),
  };
}

/**
 * 公開範囲が「全体公開」、または自社の国・会社コードが対象に含まれるドキュメントのみを取得する。
 * `locale`に対応するタイトル・説明（未登録の場合は既定言語`ja`にフォールバック）に解決して返す。
 */
export async function listDocumentsVisibleTo(
  country: string,
  companyCode: string,
  locale: string = DEFAULT_DOCUMENT_LOCALE
): Promise<DocumentSummary[]> {
  const records = await prisma.document.findMany({
    where: documentVisibleToWhere(country, companyCode),
    orderBy: ORDER_BY_UPLOADED_AT_DESC,
    select: DOCUMENT_SUMMARY_SELECT,
  });

  return records
    .map(mapDocumentSummary)
    .map((item) => ({ ...item, ...resolveDocumentContent(item, locale) }));
}

/**
 * 指定したIDのドキュメントを1件取得する。自社の国・会社コードが公開範囲に含まれない、
 * または該当データが存在しない場合はnullを返す。`locale`に対応するタイトル・説明
 * （未登録の場合は既定言語`ja`にフォールバック）に解決して返す。
 */
export async function findDocumentVisibleTo(
  id: string,
  country: string,
  companyCode: string,
  locale: string = DEFAULT_DOCUMENT_LOCALE
): Promise<DocumentSummary | null> {
  const record = await prisma.document.findFirst({
    where: { id, ...documentVisibleToWhere(country, companyCode) },
    select: DOCUMENT_SUMMARY_SELECT,
  });
  if (!record) {
    return null;
  }

  const document = mapDocumentSummary(record);
  return { ...document, ...resolveDocumentContent(document, locale) };
}

/**
 * 公開範囲による絞り込みを行わず、ドキュメント全件をアップロード日の降順で取得する。
 * 表示解決（`resolveDocumentContent`）は行わず、既定言語（`ja`＝親列）と全翻訳をそのまま返す
 * （ヘルプデスク側フォームが全言語を編集できるようにするため）。
 */
export async function listAllDocuments(): Promise<DocumentSummary[]> {
  const records = await prisma.document.findMany({
    orderBy: ORDER_BY_UPLOADED_AT_DESC,
    select: DOCUMENT_SUMMARY_SELECT,
  });

  return records.map(mapDocumentSummary);
}

/**
 * 公開範囲による絞り込みを行わず、指定したIDのドキュメントを1件取得する。
 * 表示解決は行わず、既定言語（`ja`＝親列）と全翻訳をそのまま返す。
 */
export async function findDocumentById(id: string): Promise<Document | null> {
  const record = await prisma.document.findUnique({
    where: { id },
    include: DOCUMENT_INCLUDE,
  });

  return record ? mapDocument(record) : null;
}

/** 配信ルートが返すファイル本体（アップロード方式のPDFのみ）。 */
export interface DocumentFile {
  fileName: string;
  dataUrl: string;
}

/** 認可確認用の軽量な情報（本体は含まない）。 */
export interface DocumentFileMeta {
  id: string;
  fileName: string;
}

function toDocumentFile(
  record: { sourceType: string; fileName: string | null; dataUrl: string | null } | null
): DocumentFile | null {
  if (!record || record.sourceType !== "upload" || !record.dataUrl) {
    return null;
  }
  return { fileName: record.fileName ?? "document.pdf", dataUrl: record.dataUrl };
}

function toDocumentFileMeta(
  record: { id: string; sourceType: string; fileName: string | null } | null
): DocumentFileMeta | null {
  if (!record || record.sourceType !== "upload") {
    return null;
  }
  return { id: record.id, fileName: record.fileName ?? "document.pdf" };
}

const DOCUMENT_FILE_META_SELECT = { id: true, sourceType: true, fileName: true } as const;

/**
 * 自社に可視なアップロード方式ドキュメントの認可確認（本体は読まない）。可視性は一覧と同じ述語
 * （`documentVisibleToWhere`）を再利用する。他社向け・下書き・存在しない・Google方式はnull。
 */
export async function findDocumentFileMetaVisibleTo(
  id: string,
  country: string,
  companyCode: string
): Promise<DocumentFileMeta | null> {
  const record = await prisma.document.findFirst({
    where: { id, ...documentVisibleToWhere(country, companyCode) },
    select: DOCUMENT_FILE_META_SELECT,
  });
  return toDocumentFileMeta(record);
}

/** 公開範囲によらずIDだけで認可確認する（ヘルプデスク用、本体は読まない）。 */
export async function findDocumentFileMetaById(id: string): Promise<DocumentFileMeta | null> {
  const record = await prisma.document.findUnique({
    where: { id },
    select: DOCUMENT_FILE_META_SELECT,
  });
  return toDocumentFileMeta(record);
}

/**
 * HEAD用。認可確認済みのIDについて、本体をNodeへ転送せずDB側で長さ・先頭・末尾だけ集計する。
 * dataUrlがnullまたは存在しない場合はnull。
 * 改行・空白（CR/LF/タブ/スペース）だけを`replace`で除去する（`regexp_replace`や`translate`より軽い。20MiB資料で約半分）。
 * 同時数は呼び出し側で制限する。それ以外の不正文字はGET（Nodeのデコード）では無視されるが
 * ここでは数えるため、不正なdataUrlではHEADとGETのサイズが食い違い得る。
 * なお先頭プレフィックスの判定は先頭300文字だけで行う（GETは全体に対して判定）ため、
 * `;[^,]*`が300文字を超える異常なdataUrlではHEADが404・GETが200になり得る（DBに異常データがある場合のみ）。
 */
export async function getDocumentFileStats(id: string): Promise<PdfFileStats | null> {
  const rows = await prisma.$queryRaw<
    {
      head: string;
      clean_length: number | bigint;
      clean_tail: string;
      first_pad: number | bigint;
    }[]
  >(Prisma.sql`
    WITH src AS MATERIALIZED (
      SELECT substr("dataUrl", 1, 300) AS head,
             replace(replace(replace(replace(
               substr("dataUrl", strpos(substr("dataUrl", 1, 300), ',') + 1),
               E'\\r', ''), E'\\n', ''), E'\\t', ''), ' ', ''
             ) AS clean
      FROM "Document"
      WHERE id = ${id} AND "sourceType" = 'upload' AND "dataUrl" IS NOT NULL
    )
    SELECT head,
           length(clean) AS clean_length,
           right(clean, 2) AS clean_tail,
           strpos(clean, '=') AS first_pad
    FROM src
  `);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    head: row.head,
    cleanLength: Number(row.clean_length),
    cleanTail: row.clean_tail,
    firstPad: Number(row.first_pad),
  };
}

/**
 * 自社に可視なドキュメントのファイル本体を1件取得する（セマフォ取得後に呼ぶ）。可視性は
 * 認可確認と同じ述語を再適用する。他社向け・下書き・存在しない・Google方式・本体なしはnull。
 */
export async function findDocumentFileVisibleTo(
  id: string,
  country: string,
  companyCode: string
): Promise<DocumentFile | null> {
  const record = await prisma.document.findFirst({
    where: { id, ...documentVisibleToWhere(country, companyCode) },
    select: DOCUMENT_FILE_SELECT,
  });
  return toDocumentFile(record);
}

/** 公開範囲によらずIDだけでファイル本体を取得する（ヘルプデスク用）。 */
export async function findDocumentFileById(id: string): Promise<DocumentFile | null> {
  const record = await prisma.document.findUnique({
    where: { id },
    select: DOCUMENT_FILE_SELECT,
  });
  return toDocumentFile(record);
}

/** ドキュメントを新規作成する。アップロード日時は保存操作を行った時刻とする。 */
export async function createDocumentRecord(input: CreateDocumentInput): Promise<DocumentSummary> {
  const record = await prisma.document.create({
    data: {
      ...toDocumentData(input),
      // 新規作成時は既存の翻訳行が存在しないため`deleteMany`を含まない単純な`create`のみを使う
      // （`deleteMany`は更新時にのみ有効なネスト書き込み操作。`announcement-service.ts`の
      // `createAnnouncementRecord`と同型）。
      translations: {
        create: input.translations.map((translation) => ({
          locale: translation.locale,
          title: translation.title,
          description: translation.description,
        })),
      },
    },
    select: DOCUMENT_SUMMARY_SELECT,
  });

  return mapDocumentSummary(record);
}

/** 既存ドキュメントの内容を更新する。存在しない場合は`DocumentNotFoundError`を送出する。 */
export async function updateDocumentRecord(
  id: string,
  input: CreateDocumentInput
): Promise<DocumentSummary> {
  try {
    const record = await prisma.document.update({
      where: { id },
      data: {
        ...toDocumentData(input),
        translations: translationsToNestedWrite(input.translations),
      },
      select: DOCUMENT_SUMMARY_SELECT,
    });

    return mapDocumentSummary(record);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new DocumentNotFoundError(id);
    }
    throw error;
  }
}

/**
 * 指定した言語の翻訳行のみを追加・更新する（他言語の行は触らない）。再翻訳で不足言語だけを
 * 補うために使う。存在しない場合は`DocumentNotFoundError`を送出する。
 */
export async function upsertDocumentTranslations(
  id: string,
  translations: Document["translations"]
): Promise<void> {
  const exists = await prisma.document.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    throw new DocumentNotFoundError(id);
  }

  await prisma.$transaction(
    translations.map((translation) =>
      prisma.documentTranslation.upsert({
        where: { documentId_locale: { documentId: id, locale: translation.locale } },
        create: {
          documentId: id,
          locale: translation.locale,
          title: translation.title,
          description: translation.description,
        },
        update: { title: translation.title, description: translation.description ?? null },
      })
    )
  );
}

/** ドキュメントを削除する。存在しない場合は`DocumentNotFoundError`を送出する。 */
export async function deleteDocumentRecord(id: string): Promise<void> {
  try {
    await prisma.document.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new DocumentNotFoundError(id);
    }
    throw error;
  }
}

/**
 * 指定した大分類（`categoryId`）配下で、自社に可視なドキュメントのみをアップロード日の
 * 降順で取得する。中分類が未設定のドキュメントも含む。`documents`spec側の大分類配下一覧が
 * 利用する。既存`listDocumentsVisibleTo`のシグネチャは変更しないため、カテゴリ絞り込みは
 * この別関数として追加する。
 */
export async function listVisibleDocumentsInCategory(
  categoryId: string,
  country: string,
  companyCode: string,
  locale: string = DEFAULT_DOCUMENT_LOCALE
): Promise<DocumentSummary[]> {
  const records = await prisma.document.findMany({
    where: { categoryId, ...documentVisibleToWhere(country, companyCode) },
    orderBy: ORDER_BY_UPLOADED_AT_DESC,
    select: DOCUMENT_SUMMARY_SELECT,
  });

  return records
    .map(mapDocumentSummary)
    .map((item) => ({ ...item, ...resolveDocumentContent(item, locale) }));
}
