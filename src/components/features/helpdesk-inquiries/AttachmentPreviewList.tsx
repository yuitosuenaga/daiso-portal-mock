import { formatFileSize } from "@/lib/attachment-utils";
import type { InquiryAttachment } from "@/types/attachment";

export interface AttachmentPreviewListProps {
  attachments: InquiryAttachment[];
}

/**
 * 添付ファイルの読み取り専用プレビュー・ダウンロードリスト。
 * 選択・削除操作は持たない（編集可能な選択UIは`inquiry-form`所有の`AttachmentField`）。
 * `inquiryId`等の文脈に依存しない汎用設計とし、`inquiry-list`spec次ラウンドでの再利用に備える。
 */
export function AttachmentPreviewList({
  attachments,
}: AttachmentPreviewListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-3">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a
            href={attachment.dataUrl}
            download={attachment.fileName}
            className="flex items-center gap-2 rounded-md border border-input p-2 text-sm hover:bg-accent"
          >
            {attachment.fileType.startsWith("image/") && (
              // data URLはローカルのプレビューであり next/image の最適化対象外のため素の img を使う
              // alt=""で装飾扱いにする（隣接するテキストが既にファイル名を伝えているため、
              // スクリーンリーダーでファイル名が二重に読み上げられるのを防ぐ）
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.dataUrl}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            )}
            <span className="max-w-[10rem] truncate">
              {attachment.fileName} ({formatFileSize(attachment.fileSize)})
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
