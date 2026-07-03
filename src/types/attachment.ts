// 問い合わせ・返信に添付するファイルのドメイン型定義（フェーズ1の仮定義）。
// フェーズ1は実ファイルストレージを持たないため、ファイル内容はBase64データURLとして保持する。

/**
 * 添付ファイル1件を表す値オブジェクト。
 * `inquiry-form`spec所有。`helpdesk-inquiry-management`（返信の添付）・`inquiry-list`（詳細画面での表示）が
 * 読み取り専用の依存として同じ型を再利用する。
 */
export type InquiryAttachment = {
  id: string;
  fileName: string;
  /** MIMEタイプ（`ATTACHMENT_ALLOWED_MIME_TYPES`のいずれか） */
  fileType: string;
  /** バイト数 */
  fileSize: number;
  /** `FileReader.readAsDataURL`で生成したBase64データURL文字列 */
  dataUrl: string;
};
