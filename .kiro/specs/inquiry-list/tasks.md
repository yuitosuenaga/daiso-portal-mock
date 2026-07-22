# 実装タスク: inquiry-list

## 実装計画

- [x] 1. 基盤セットアップ（モックデータ・モックAPI・Badge拡張・翻訳キー）
- [x] 1.1 一覧・詳細取得のモックAPI関数を実装する
  - `lib/api/inquiries.ts`に、自社の問い合わせ一覧表示用の静的モックデータ（`Inquiry[]`、対応状況・緊急度・案件種別が一通り確認できる5〜10件程度）を追加する
  - 全件を`createdAt`降順で返す関数（`getInquiries`）と、指定IDの問い合わせを1件返す関数（`getInquiryById`）を追加し、該当データが存在しない場合は`null`を解決する
  - 既存の`createInquiry`・`getInquiryStatusSummary`関数のコード・型・挙動を変更しない
  - `getInquiries`が`createdAt`降順で全件を返し、`getInquiryById`が存在しないIDに対して`null`を返すことで完了とする
  - _Requirements: 2.1, 3.3, 5.1, 5.2, 5.3_

- [x] 1.2 Badgeコンポーネントに対応状況・緊急度用のvariantを追加する
  - `components/ui/badge.tsx`の`variant`に、対応状況用（`status-new`/`status-in_progress`/`status-resolved`）・緊急度用（`urgency-high`/`urgency-medium`/`urgency-low`）のキーを追加する
  - 既存のキー（`maintenance`/`policy`/`incident`/`other`）を変更しないことで完了とする
  - _Requirements: 2.2, 2.3_

- [x] 1.3 問い合わせ一覧・詳細の日本語・英語翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に`inquiryList`名前空間（一覧見出し・空/エラーメッセージ・対応状況の表示ラベル・詳細画面のラベル・見つからないメッセージ・一覧へ戻るリンク）を追加する
  - 案件種別・緊急度・国の表示ラベルは既存の`inquiryForm.options.*`翻訳キーを再利用し、重複して追加しない
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 1.3, 2.4, 3.2, 6.1, 6.2_

---

- [x] 2. InquiryListItemコンポーネントを実装する
  - 1件分の問い合わせの案件種別・地域・送信日時・対応状況バッジ・緊急度バッジを表示し、詳細画面へのリンクを設置する
  - クリックすると対応する問い合わせの詳細画面へ遷移することで完了とする
  - _Requirements: 1.2, 2.2, 2.3, 2.4, 4.1_
  - _Depends: 1.2, 1.3_

---

- [x] 3. InquiryListコンポーネントを実装する
  - `getInquiries()`を`try/catch`で呼び出し、`InquiryListItem`のリストとして表示する
  - データ取得中はスケルトンUI（同ファイルの`InquiryListSkeleton`）、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示する
  - ブラウザで一覧を開くと問い合わせが送信日時降順で表示されることで完了とする
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.3, 5.1_
  - _Depends: 1.1, 1.3, 2_

---

- [x] 4. (P) InquiryDetailコンポーネントを実装する
  - 指定されたIDの問い合わせを取得し、案件種別・緊急度・地域・対応状況・送信日時・自由記述（原文）・申請者情報（会社名・国）を表示する
  - データ取得失敗時はエラーメッセージ、該当データが存在しない（`null`）場合は見つからないメッセージを、それぞれ区別して表示する
  - 一覧ページへ戻るためのリンクを常に表示する
  - 存在するIDでは詳細情報が表示され、存在しないIDでは見つからないメッセージが表示されることで完了とする
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3_
  - _Boundary: InquiryDetail_
  - _Depends: 1.1, 1.2, 1.3_

---

- [x] 5. ページ統合
- [x] 5.1 (P) 問い合わせ一覧ページにInquiryListを統合する
  - `/inquiry`ページの表示内容を、Placeholder表示から`Suspense`+`InquiryListSkeleton`でラップした`InquiryList`の表示に置き換える
  - タブレット幅（768px以上）で横スクロールが発生しないレイアウトにする
  - ブラウザで`/ja/inquiry`・`/en/inquiry`を開くと、Placeholderではなく実際の問い合わせ一覧が表示されることで完了とする
  - _Requirements: 1.1, 7.1_
  - _Boundary: InquiryListPage_
  - _Depends: 3_

- [x] 5.2 (P) 問い合わせ詳細ページ（動的ルート）を新規作成する
  - `app/[locale]/inquiry/[id]/page.tsx`を新規作成し、`Suspense`+`InquiryDetailSkeleton`でラップした`InquiryDetail`にURLパラメータの`id`を渡す
  - タブレット幅（768px以上）で横スクロールが発生しないレイアウトにする
  - 一覧の問い合わせ項目をクリックすると詳細画面へ遷移し、内容が表示されることで完了とする
  - _Requirements: 4.1, 7.1_
  - _Boundary: InquiryDetailPage_
  - _Depends: 4_

---

- [ ] 6. 検証
- [x] 6.1 モックAPI関数のユニットテストを作成する
  - `getInquiries`が`createdAt`降順で全件を返すことを検証する
  - `getInquiryById`が存在するIDでは対応する問い合わせを、存在しないIDでは`null`を返すことを検証する
  - 既存の`createInquiry`・`getInquiryStatusSummary`の戻り値・挙動が変更されていないことを検証するテストが通ることで完了とする
  - _Requirements: 2.1, 5.1, 5.2, 5.3_
  - _Depends: 1.1_

- [x] 6.2 一覧・詳細コンポーネントの状態別表示の統合テストを作成する
  - `InquiryList`の空状態・エラー状態の表示切り替えを検証する
  - `InquiryDetail`の「見つからない」状態と「エラー」状態が異なるメッセージで表示され、一覧へ戻るリンクが常に表示されることを検証するテストが通ることで完了とする
  - _Requirements: 3.1, 3.2, 3.3, 4.3, 4.4_
  - _Depends: 3, 4_

- [ ] 6.3 * レスポンシブレイアウトと多言語表示・視覚的区別のE2E確認を行う
  - タブレット幅表示時のレイアウト崩れの有無、日本語・英語切り替え時に対応状況・緊急度ラベルを含む全文言が切り替わることを確認する
  - 対応状況・緊急度バッジが視覚的に区別されることを確認する
  - _Requirements: 6.2, 7.1_
  - _Depends: 5.1, 5.2_

---

## 追加ラウンド（2026-07-03）: 対応履歴・返信内容の表示

- [x] 7. 基盤セットアップ（対応履歴・対応中バッジ用の翻訳キー）
- [x] 7.1 対応履歴・対応中バッジの日本語・英語翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に対応中バッジのラベル、対応履歴セクションの見出し・空状態メッセージ・エラーメッセージ・返信ラベル・対応中/対応解除の固定文言を追加する
  - `released`（対応解除）の文言は、既存の対応状況（`resolved`）と意味が混同されないよう「完了」という語を使わない表現にする
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 8.4, 9.2_

---

- [x] 8. (P) InquiryHistoryListコンポーネントを実装する
  - 指定された問い合わせの対応履歴を取得し、時系列（新しい順）で一覧表示する
  - 返信（`reply_sent`）は返信本文全文をラベル付きで表示し、対応状況変更（`status_changed`）は変更後の対応状況が分かる文言を表示し、対応中/対応解除（`claimed`/`released`）は状態の変化のみを示す固定文言を表示する。いずれの種別でも担当者名は表示しない
  - 対応履歴が0件のときは空状態メッセージを、取得に失敗したときはエラーメッセージを表示する
  - ブラウザで返信・ステータス変更・対応中フラグ操作が記録された問い合わせを開くと、担当者名を含まずに各履歴が時系列で表示されることで完了とする
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - _Boundary: InquiryHistoryList_
  - _Depends: 7.1_

---

- [x] 9. 対応中バッジ・対応履歴セクションをInquiryDetailへ統合する
- [x] 9.1 InquiryDetailに対応中バッジと対応履歴セクションを組み込む
  - 問い合わせが対応中の状態のとき、既存の対応状況バッジの付近に担当者名を含まない対応中バッジを表示し、対応中でないときは表示しない
  - 対応履歴セクション（`InquiryHistoryList`）を詳細情報の下に表示する
  - タブレット幅（768px以上）で横スクロールが発生しないレイアウトを維持する
  - ブラウザでヘルプデスク側が対応中にした問い合わせを開くと対応中バッジが表示され、対応を外すと表示が消えることで完了とする
  - _Requirements: 9.1, 9.2, 9.3, 7.1_
  - _Boundary: InquiryDetail_
  - _Depends: 8_

---

- [x] 10. 検証（対応履歴・対応中バッジ）
- [x] 10.1 InquiryHistoryListのユニット・統合テストを作成する
  - 種別（`reply_sent`/`status_changed`/`claimed`/`released`）ごとの表示文言の分岐、0件時の空状態、取得失敗時のエラー表示を検証する
  - いずれの種別でも`actorName`がDOM上に一切出力されないことを検証するテストが通ることで完了とする
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - _Depends: 8_

- [x] 10.2 InquiryDetailの対応中バッジ統合テストを作成する
  - `claim`が設定されている場合とされていない場合で対応中バッジの表示/非表示が切り替わることを検証する
  - `claim.staffName`がDOM上に一切出力されないことを検証するテストが通ることで完了とする
  - _Requirements: 9.1, 9.2, 9.3_
  - _Depends: 9.1_

- [x] 10.3 * ヘルプデスク操作の反映確認E2Eを行う
  - ヘルプデスク側で返信・ステータス変更・対応中フラグ操作を行った直後に、申請者側の問い合わせ詳細画面へ遷移し、対応履歴・対応中バッジに反映されることを日本語・英語の両方で確認する
  - _Requirements: 8.1, 8.2, 8.3, 9.1_
  - _Depends: 9.1_

---

## 追加ラウンド（2026-07-07）: 添付ファイルの表示

- [x] 11. (P) InquiryDetailに問い合わせ本文の添付ファイル表示を統合する
  - `messages/ja.json`・`messages/en.json`の`inquiryList.detail`名前空間に`attachmentsLabel`（「添付ファイル」、`helpdeskInquiries.detail.attachmentsLabel`と同等のラベル）を追加する
  - 問い合わせ本文（自由記述）セクションの直後に、`inquiry.attachments`が1件以上存在する場合のみ`attachmentsLabel`ラベルとともに既存の`AttachmentPreviewList`（`helpdesk-inquiry-management`spec所有・既存コンポーネント）へ渡して表示する
  - ブラウザで添付ファイル付きの問い合わせを開くとファイル名・サイズ（画像はサムネイル）が表示され、ダウンロードできることで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.6_
  - _Boundary: InquiryDetail_
  - _Depends: 4_

- [x] 12. (P) InquiryHistoryListに返信添付ファイルの表示を統合する
  - `reply_sent`種別の分岐（返信本文の直後）で、`entry.attachments ?? []`を`AttachmentPreviewList`へ渡して表示する
  - 他の種別（`status_changed`/`claimed`/`released`）は変更しない
  - ブラウザで添付ファイル付きの返信が記録された問い合わせを開くと、対応履歴の返信項目に添付ファイルが表示されダウンロードできることで完了とする
  - _Requirements: 10.4, 10.5, 10.6_
  - _Boundary: InquiryHistoryList_
  - _Depends: 8_

---

- [x] 13. 検証（添付ファイル表示）
- [x] 13.1 InquiryDetail・InquiryHistoryListの添付ファイル表示テストを作成する
  - `InquiryDetail`が`inquiry.attachments`の有無（1件以上/未定義/空配列）に応じて添付ファイル欄の表示・非表示を切り替えることを検証する
  - `InquiryHistoryList`が`reply_sent`項目の`entry.attachments`の有無に応じて添付ファイル欄の表示・非表示を切り替え、他の種別には添付ファイル欄が出力されないことを検証するテストが通ることで完了とする
  - _Requirements: 10.1, 10.3, 10.4, 10.5_
  - _Depends: 11, 12_

- [x] 13.2 * 添付ファイル付き問い合わせ・返信のE2E確認を行う
  - 添付ファイル付きの問い合わせ・添付ファイル付きの返信を持つ問い合わせ詳細画面で、画像サムネイル・ファイル名・サイズが表示されダウンロードリンクが機能することを日本語・英語の両方、タブレット幅で確認する
  - _Requirements: 10.1, 10.2, 10.4_

---

## 追加ラウンド（2026-07-07・2）: 追加メッセージの送信

> 本ラウンドは`helpdesk-inquiry-management`spec側のタスク16（`InquiryHistoryEntryType`への`requester_message`追加）と対になっている。タスク15・18は同spec側のタスク16.1完了後に着手すること。

- [x] 14. 基盤: 追加メッセージ送信用の翻訳キー
- [x] 14.1 追加メッセージ送信フォーム・対応履歴ラベルの日本語・英語翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に`inquiryList.message`名前空間（`sectionTitle`/`bodyLabel`/`bodyPlaceholder`/`submitButton`/`submitting`/`successMessage`/`error`/`attachments.*`、`helpdeskInquiries.reply`と同じキー構造）を追加する
  - `inquiryList.history`名前空間に`requesterMessageLabel`（「送信したメッセージ」/"Your Message"）を追加する
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 6.1, 6.2_

---

- [x] 15. (P) sendApplicantMessageActionを実装する
  - `src/lib/actions/inquiry.ts`を新規作成し、`"use server"`の`sendApplicantMessageAction(inquiryId, body, attachments)`を実装する
  - 本文の空文字列チェック（zod）、添付ファイルの`inquiryAttachmentsArraySchema`（`inquiry-form`spec所有）によるサーバー側検証を行う
  - `getInquiryById(inquiryId)`で対象問い合わせを取得し、`submittedBy.companyName`を`actorName`として`appendInquiryHistoryEntry`（`helpdesk-inquiry-management`spec所有）を`type: "requester_message"`で呼び出す
  - `/[locale]/inquiry/[id]`・`/[locale]/helpdesk/inquiries/[id]`の両ルートを`revalidatePath`する
  - `Inquiry`の`status`・`claim`を変更しないことで完了とする
  - _Requirements: 11.4, 11.8_
  - _Boundary: SendApplicantMessageAction_
  - _Depends: 14.1_

- [x] 16. (P) ApplicantMessageFormコンポーネントを実装する
  - `src/components/features/inquiry-list/ApplicantMessageForm.tsx`を新規作成する（`"use client"`）
  - 本文入力欄（`Textarea`）・`AttachmentField`（`inquiry-form`spec所有）・送信ボタンを配置し、本文が空文字列（トリム後）のときは送信ボタンを無効化する
  - `useTransition`で`sendApplicantMessageAction`を呼び出し、送信成功時は入力欄をリセット、失敗時はエラーメッセージを表示し入力内容を保持する
  - `helpdesk-inquiry-management`spec所有の`ReplyForm`と同じ状態管理パターンに従うことで完了とする
  - _Requirements: 11.1, 11.2, 11.3, 11.7_
  - _Boundary: ApplicantMessageForm_
  - _Depends: 14.1_

---

- [x] 17. InquiryDetailにApplicantMessageFormを組み込む
  - 対応履歴セクションの下に、`ApplicantMessageForm`を`inquiry.id`とともに追加描画する
  - 問い合わせが見つからない・取得エラーの状態では表示しない
  - ブラウザで問い合わせ詳細画面を開くと追加メッセージの送信フォームが表示されることで完了とする
  - _Requirements: 11.1_
  - _Boundary: InquiryDetail_
  - _Depends: 15, 16_

- [x] 18. InquiryHistoryListにrequester_message種別の表示を統合する
  - `renderEntryContent`のswitch文に`case "requester_message":`を追加する（`helpdesk-inquiry-management`spec側でのInquiryHistoryEntryTypeへの追加が前提）
  - `requesterMessageLabel`（「送信したメッセージ」）ラベルとともに`entry.detail`を表示し、`entry.attachments ?? []`を`AttachmentPreviewList`へ渡してレンダリングする
  - `entry.actorName`（会社名）は他の種別と同様に表示しない
  - 送信した自分自身のメッセージが対応履歴セクションに他の履歴種別と時系列で混在して表示されることで完了とする
  - _Requirements: 11.5, 11.6_
  - _Boundary: InquiryHistoryList_
  - _Depends: 14.1_

---

- [x] 19. 検証（追加メッセージの送信）
- [x] 19.1 sendApplicantMessageActionのユニットテストを作成する
  - 本文未入力を拒否すること、添付ファイルをサーバー側で検証すること、`appendInquiryHistoryEntry`を`type: "requester_message"`・会社名の`actorName`で正しく呼び出すことを検証する
  - `Inquiry`の`status`・`claim`が変更されないことを検証するテストが通ることで完了とする
  - _Requirements: 11.3, 11.4, 11.8_
  - _Depends: 15_

- [x] 19.2 ApplicantMessageForm・InquiryHistoryListの統合テストを作成する
  - 本文未入力のとき送信ボタンが無効化されること、添付ファイルを選択して送信すると`sendApplicantMessageAction`に渡されることを検証する
  - 送信成功時に入力欄がリセットされ、送信失敗時に入力内容が保持されることを検証する
  - `InquiryHistoryList`が`requester_message`エントリを`reply_sent`と区別可能なラベルで表示し、添付ファイルを表示することを検証するテストが通ることで完了とする
  - _Requirements: 11.2, 11.3, 11.5, 11.6, 11.7_
  - _Depends: 16, 17, 18_

- [x] 19.3 * 追加メッセージ送受信のE2E確認を行う
  - 申請者側詳細画面から添付ファイル付きの追加メッセージを送信すると、ページ全体を再読み込みせずに対応履歴セクションへ反映されることを確認する
  - 同じ問い合わせをヘルプデスク側で開くと、同じメッセージが対応履歴タイムラインに表示されることを日本語・英語の両方で確認する（`helpdesk-inquiry-management`spec側のタスク18と合わせて実施）
  - _Requirements: 11.4, 11.5, 11.6_
  - _Depends: 19.2_
  - _Depends: 13.1_

---

## 追加ラウンド（2026-07-10）: タイトル表示・本文プレビュー・余白改善

> 本ラウンドは`inquiry-form`spec側のタスク10（title列のスキーマ・型・バリデーション・翻訳キー追加）と対になっている。本ラウンドのタスクは同spec側のタスク10・12完了後に着手すること。

- [x] 20. (P) InquiryListItemにタイトル見出し・種別バッジ・本文プレビューを追加する
  - リンク見出しのテキストを`categoryLabel`から`inquiry.title`に変更する
  - 案件種別を、既存のstatus/urgencyバッジと同様のバッジとして追加表示する
  - タイトルリンクの直下に、`originalText`の`line-clamp-2`プレビュー段落を追加する（`AnnouncementListItem`の`showBodyExcerpt`実装と同じパターン）
  - ブラウザで`/inquiry`を開くと各行にタイトル・種別バッジ・本文の2行プレビューが表示されることで完了とする
  - _Requirements: 12.1, 12.2, 12.3_
  - _Boundary: InquiryListItem_
  - _Depends: inquiry-form spec タスク10, 12_

- [x] 21. (P) InquiryDetailにタイトル見出しを追加する
  - 既存のフィールド一覧表示はそのまま維持し、`inquiry.title`を見出しとして追加表示する
  - ブラウザで問い合わせ詳細画面を開くとタイトルが見出しとして表示されることで完了とする
  - _Requirements: 12.4_
  - _Boundary: InquiryDetail_
  - _Depends: inquiry-form spec タスク10, 12_

- [x] 22. InquiryListの重複見出しを除去し余白を整理する
  - 成功・空・エラーの3状態すべてで、`<Card><CardHeader><CardTitle>{t("list.title")}</CardTitle></CardHeader><CardContent>`を`<Card><CardContent className="pt-6">`に置き換える（`AnnouncementList`と同じ構成）
  - `InquiryListSkeleton`は変更しない
  - ブラウザで`/inquiry`を開くと、ページ見出し（h1）のみが表示され`Card`内に重複した見出しが表示されないことで完了とする
  - _Requirements: 12.5_
  - _Boundary: InquiryList_

---

- [x] 23. 検証（タイトル表示・本文プレビュー・余白改善）
- [x] 23.1 InquiryList・InquiryDetailの統合テストを更新する
  - `InquiryList.test.tsx`が重複見出し除去後も既存のテストが通ることを確認する
  - `InquiryListItem`のタイトルリンク・種別バッジ・本文プレビューの描画を検証するテストを追加する（`InquiryList.test.tsx`内、または新規`InquiryListItem.test.tsx`）
  - `InquiryDetail.test.tsx`の既存リテラルに`title`を追加し、タイトルが見出しとして表示されることを検証するテストが通ることで完了とする
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - _Depends: 20, 21, 22_

- [ ] 23.2 * タイトル表示・本文プレビュー・余白改善のE2E確認を行う
  - `/inquiry`で各行にタイトル・種別バッジ・本文の2行プレビューが表示され、`Card`上部の重複見出しが表示されないことを日本語・英語の両方で確認する
  - `/inquiry/[id]`でタイトルが見出しとして表示されることを確認する
  - _Requirements: 12.1, 12.4, 12.5_
  - _Depends: 23.1_

---

## 追加ラウンド（2026-07-13）: 問い合わせ一覧の検索・絞り込み

- [x] 24. 基盤: 検索・絞り込み用の翻訳キーとフィルタ純関数
- [x] 24.1 検索・絞り込みの翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に`inquiryList.filter`名前空間（検索欄プレースホルダー・対応状況/案件種別の絞り込みラベル・クリア操作・0件時メッセージ）を追加する
  - 対応状況・案件種別の選択肢ラベルは既存の`inquiryList`/`inquiryForm.options.*`翻訳キーを再利用し、重複して追加しない
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 13.9_
  - _Boundary: i18n messages_

- [x] 24.2 (P) 問い合わせ一覧のフィルタ純関数を実装する
  - キーワード（`title`・`originalText`の部分一致・大小文字無視）・対応状況・案件種別のAND条件で`Inquiry[]`を絞り込む申請者側専用の純粋関数と、そのフィルタ条件型を実装する（`announcements`spec の`filterAnnouncements`と同じ設計方針。実装は共有しない）
  - 各条件が未指定のときはその条件で絞り込まず、全条件が空のとき入力配列をそのまま（送信日時降順の順序を維持して）返すことで完了とする
  - _Requirements: 13.2, 13.3, 13.4, 13.8_
  - _Boundary: filterInquiries_

---

- [x] 25. コア: 検索フィルタUIとクライアント側一覧を実装し一覧ページに結線する
  - キーワード・対応状況・案件種別の絞り込み入力を受け付け変更を通知する`InquiryFilterBar`と、フィルタ状態を保持して絞り込み済み一覧を描画する`InquiryListClient`を実装する（`announcements`spec のフィルタパターンを踏襲）
  - 既存の`InquiryList`をデータ取得専用のサーバーコンポーネントに整理し、一覧描画を`InquiryListClient`へ委譲する
  - クリア操作で全条件を解除できる。絞り込み結果が0件のとき「該当する問い合わせがありません」を表示し、絞り込み後も送信日時降順を維持する
  - ブラウザで`/inquiry`を開き、キーワード・対応状況・案件種別で絞り込むと一覧が即時に絞り込まれることで完了とする
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  - _Boundary: InquiryFilterBar, InquiryListClient, InquiryList_
  - _Depends: 24.1, 24.2_

---

- [x] 26. 検証: 単体テスト・多言語/レスポンシブ確認
- [x] 26.1 (P) フィルタ純関数の単体テストを実装する
  - `filterInquiries`がキーワード（`title`・`originalText`部分一致・大小文字無視）・対応状況・案件種別のAND条件で絞り込むこと、全条件が空のとき全件を返すことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 13.2, 13.3, 13.4, 13.8_
  - _Depends: 24.2_

- [x]* 26.2 (P) 検索フィルタUIの統合テストを実装する
  - キーワード・対応状況・案件種別を入力すると一覧が絞り込まれ、クリアで全件表示に戻ること、0件時にメッセージが表示されることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 13.1, 13.5, 13.6, 13.7_
  - _Depends: 25_

- [ ] 26.3 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールでフィルタバーのラベル・0件メッセージが正しく切り替わることを確認する
  - タブレット幅（768px）でフィルタバーが横スクロールを起こさないことを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 13.9_

---

## 追加ラウンド（2026-07-15）: 表示文言変更（問い合わせ一覧→申請一覧）の反映確認

- [x] 27. 別ブランチ（`chore/rename-inquiry-to-application-labels`）で実装済みの表示文言変更が本specの対象範囲に反映されていることを確認する
  - サイドバーの`navigation.inquiryList`および本ページの見出し・空状態・エラー状態（`inquiryList.list.title`/`.empty`/`.error`）が「申請一覧」表記になっていることを`messages/ja.json`で確認する
  - 機能・データモデル（`Inquiry`型、`/inquiry`ルート、モックAPI等）に変更がないことを確認する
  - _Requirements: 1.1（更新）_
  - _Depends: 25_

---

## 追加ラウンド（2026-07-17）: 新着返信の未読表示と既読管理

> 本ラウンドはメール等の外部通知を含まない（保留）。画面内での未読/新着表示と既読管理のみを対象とする。データモデル（`Inquiry.lastReadAt`）の追加を伴うため、実装時に`prisma migrate`で1マイグレーションを追加すること（本設計・タスクフェーズではマイグレーションコマンドは実行しない）。

- [x] 28. データモデル・サービス層: 既読タイムスタンプと未読判定
- [x] 28.1 `Inquiry`モデルへ既読タイムスタンプを追加しマイグレーションを作成する
  - `prisma/schema.prisma`の`Inquiry`モデルに`lastReadAt DateTime?`（nullable・既定値なし）を加法的に追加する。他モデル・他フィールドは変更しない
  - `prisma migrate dev`で後方互換なマイグレーションを1つ追加する（既存レコードは`lastReadAt = null`）
  - 公開`Inquiry`型（`src/types/inquiry.ts`）には`lastReadAt`を露出させない（未読判定はサービス層で完結させる）
  - 既存のマイグレーション・シードが引き続き通ることで完了とする
  - _Requirements: 14.4_
  - _Boundary: prisma schema, Inquiry_

- [x] 28.2 未読判定・既読更新のサービス関数を実装する
  - `src/lib/server/inquiry-service.ts`に`listUnreadReplyInquiryIds(companyId)`（会社スコープの問い合わせのうち、ヘルプデスク起点履歴（`reply_sent`/`status_changed`/`claimed`/`released`＝`requester_message`以外）の最新`occurredAt`が`lastReadAt`より新しい、または`lastReadAt`がnullでヘルプデスク起点履歴が存在するものの問い合わせIDを返す）を追加する
  - `markInquiryRead(id, companyId)`（自社スコープを確認したうえで対象問い合わせの`lastReadAt`を現在時刻に更新する。他社スコープのIDでは更新しない。`status`・`claim`は変更しない）を追加する
  - 既存のサービス関数・`INQUIRY_INCLUDE`・`mapInquiry`は変更しない
  - 単体テストで、`lastReadAt`のnull/過去/未来・`requester_message`のみの場合・他社スコープの各ケースが期待どおりに判定・更新されることで完了とする
  - _Requirements: 14.3, 14.5_
  - _Boundary: inquiry-service_
  - _Depends: 28.1_

---

- [x] 29. API・Server Action・翻訳キー
- [x] 29.1 未読ID取得・既読更新のAPI関数を実装する
  - `src/lib/api/inquiries.ts`に`getUnreadReplyInquiryIds(): Promise<string[]>`（申請者セッションを要求し自社スコープの未読IDを返す）・`markInquiryRead(inquiryId): Promise<void>`（申請者セッション・自社スコープで`lastReadAt`を更新）を追加する
  - 既存の`getInquiries`・`getInquiryById`・`getInquiryStatusSummary`等のシグネチャ・挙動は変更しない
  - _Requirements: 14.3, 14.4, 14.5_
  - _Boundary: inquiries API_
  - _Depends: 28.2_

- [x] 29.2 既読記録用のServer Actionを実装する
  - `src/lib/actions/inquiry.ts`に`markInquiryReadAction(inquiryId): Promise<void>`を追加する。`inquiryIdSchema`で検証し、`markInquiryRead`を呼び出したのち`/[locale]/inquiry`（一覧ルート）を`revalidatePath`する
  - 既存の`createInquiryAction`・`sendApplicantMessageAction`は変更しない
  - 単体テストで、他社スコープのIDでは既読更新されないこと・`status`/`claim`が変更されないことで完了とする
  - _Requirements: 14.4, 14.5, 14.6_
  - _Boundary: markInquiryReadAction_
  - _Depends: 29.1_

- [x] 29.3 新着インジケーターの日本語・英語翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`inquiryList.list`名前空間に`newBadge`（新着インジケーターの表示文言・`aria-label`用、例: 「新着」/"New"）を追加する
  - `ja.json`で定義した新規キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 14.7_
  - _Boundary: i18n messages_

---

- [x] 30. UI: 一覧の新着インジケーターと詳細の既読記録
- [x] 30.1 InquiryListItemに新着インジケーターを追加する
  - `hasUnreadReply: boolean`prop・新着ラベルpropを追加し、`true`のときタイトル付近に`aria-label`付きの新着インジケーター（`Badge`または小さなドット）を表示、`false`のとき非表示にする
  - _Requirements: 14.1, 14.2, 14.7_
  - _Boundary: InquiryListItem_
  - _Depends: 29.3_

- [x] 30.2 InquiryList・InquiryListClientで未読IDを結線する
  - `InquiryList`（Server）で`getInquiries()`と`getUnreadReplyInquiryIds()`を`Promise.all`で取得し（未読ID取得のみ失敗時は空配列にフォールバック）、`InquiryListClient`へ`unreadInquiryIds`を渡す
  - `InquiryListClient`で`unreadInquiryIds`を`Set`化し、各`InquiryListItem`へ`hasUnreadReply`を渡す。既存のフィルタ・並び順・0件表示は維持する
  - ブラウザで、ヘルプデスク起点の未読履歴がある問い合わせの行にのみ新着インジケーターが表示されることで完了とする
  - _Requirements: 14.1, 14.2_
  - _Boundary: InquiryList, InquiryListClient_
  - _Depends: 29.1, 30.1_

- [x] 30.3 詳細画面に既読記録トリガー（MarkInquiryRead）を組み込む
  - `src/components/features/inquiry-list/MarkInquiryRead.tsx`（`"use client"`、描画なし）を新規作成し、`useEffect`で`markInquiryReadAction(inquiryId)`をマウント時に1度呼び出す（エラーは握りつぶす）
  - `InquiryDetail`（Server）が問い合わせ取得成功時にのみ`<MarkInquiryRead inquiryId={inquiry.id} />`をレンダリングする（見つからない・エラー状態では既読記録しない）
  - ブラウザで詳細画面を開くと既読が記録され、一覧へ戻ると新着インジケーターが消えることで完了とする
  - _Requirements: 14.4, 14.6_
  - _Boundary: MarkInquiryRead, InquiryDetail_
  - _Depends: 29.2_

---

- [x] 31. 検証（新着表示・既読管理）
- [x] 31.1 未読判定・既読更新の単体テストを作成する
  - `listUnreadReplyInquiryIds`が`lastReadAt`のnull/過去/未来・`requester_message`のみの場合・ヘルプデスク起点履歴の最新発生時刻との比較で正しく未読を判定することを検証する
  - `markInquiryRead`が`lastReadAt`のみを更新し`status`・`claim`を変更しないこと、他社スコープのIDでは更新しないことを検証するテストが通ることで完了とする
  - _Requirements: 14.3, 14.5_
  - _Depends: 28.2, 29.1_

- [x] 31.2 InquiryListItem・MarkInquiryReadの統合テストを作成する
  - `InquiryListItem`が`hasUnreadReply`の真偽で新着インジケーターの表示/非表示を切り替えることを検証する
  - `MarkInquiryRead`がマウント時に`markInquiryReadAction`を1度呼び出すことを検証するテストが通ることで完了とする
  - _Requirements: 14.1, 14.2, 14.4_
  - _Depends: 30.1, 30.3_

- [ ] 31.3 * 新着表示・既読管理のE2E確認を行う
  - ヘルプデスク側で返信を記録→申請一覧に新着インジケーターが表示される→詳細画面を開く→一覧へ戻ると新着インジケーターが消えることを日本語・英語の両方で確認する
  - _Requirements: 14.1, 14.4, 14.6_
  - _Depends: 31.2_

## 追加（2026-07-21）: 対応履歴の視覚的表示形式（縦タイムライン）

- [x] 32. コア: 対応履歴の縦タイムライン表示
- [x] 32.1 (P) `src/lib/inquiry-history-style.tsx`を新規作成する（`helpdesk-inquiry-management`spec所有、`inquiry-list`から読み取り専用で共有利用）
  - `InquiryHistoryEntryType`ごとのアイコン（`lucide-react`）・配色（`globals.css`の既存トークンのみ）マッピングを定義する
  - _Requirements: 15.2, 15.5_
- [x] 32.2 (P) `messages/ja.json`/`messages/en.json`の`inquiryList.history`に`claimedLabel`/`releasedLabel`/`statusChangedLabel`を追加する
  - _Requirements: 15.2_
  - _Depends: なし_
- [x] 32.3 `InquiryHistoryList`を縦タイムライン形式に変更する
  - `getInquiryHistoryStyle`を用いたアイコン付きマーカー・連結線、種別バッジ、等幅日時、返信/申請者メッセージ本文のブロック表示を実装する
  - `actorName`を表示しない既存制約（要件8.4）を維持する
  - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - _Depends: 32.1, 32.2_
- [x] 33. 検証（対応履歴の視覚的表示形式）
- [x] 33.1 既存の`InquiryHistoryList.test.tsx`が変更なしで全件成功することを確認する
  - _Requirements: 15.1〜15.5_
  - _Depends: 32.3_
- [x] 33.2 `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 15.1〜15.5_
  - _Depends: 33.1_

## 追加（2026-07-22）: 申請者一覧取得の添付ファイル除外（性能）

- [ ] 34. 検証: 申請者一覧取得の添付ファイル除外
  - 取得include分離の実装自体は`helpdesk-inquiry-management`spec 要件18（タスク39）が所有・実施する。本specは申請者側の期待の確認のみを行う
- [ ] 34.1 (P) 申請者側の添付読み込み挙動を`inquiry-service.test.ts`で検証する
  - `listInquiriesForCompany`が添付なしinclude（`{ claimedByStaff: true }`）で、`findInquiryForCompany`が添付ありinclude（`{ claimedByStaff: true, attachments: true }`）で`prisma`を呼ぶことを検証する（テスト自体は`helpdesk-inquiry-management`spec 要件18のタスクと共有ファイルのため、当該ケースが含まれることを確認する）
  - _Requirements: 16.1, 16.2_
  - _Depends: helpdesk-inquiry-management 39.1, 39.2_
- [ ] 34.2 申請者詳細の添付表示が維持されることを確認する
  - 既存の`InquiryDetail.test.tsx`が変更なしで全件成功し、詳細画面の添付表示（要件10）が保たれることを確認する
  - _Requirements: 16.2, 16.3_
  - _Depends: 34.1_
