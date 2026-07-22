# 実装タスク: helpdesk-inquiry-management

## 実装計画

- [x] 1. 基盤: 型・モックストア・翻訳キーの追加
- [x] 1.1 `Inquiry`型への対応中フラグ追加とミューテーション関数を実装する
  - `types/inquiry.ts`に`claim?: { staffName: string; claimedAt: string } | null`を追加する（既存フィールドは変更しない）
  - `lib/constants/helpdesk.ts`に`MOCK_CURRENT_STAFF_NAME`（フェーズ1固定の担当者名）を定義する
  - `lib/api/inquiries.ts`に`setInquiryClaim(id, staffName)`・`updateInquiryStatus(id, status)`を追加し、`MOCK_INQUIRIES`配列の該当要素のみを更新する
  - `setInquiryClaim`/`updateInquiryStatus`を呼び出すと対象の`Inquiry`のみが更新され、他のレコードに影響しないことで完了とする
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2_
  - _Boundary: InquiriesMockApi_

- [x] 1.2 (P) 対応履歴の型・モックストアを実装する
  - `types/inquiry-history.ts`に`InquiryHistoryEntry`型（`id`, `inquiryId`, `type`, `actorName`, `occurredAt`, `detail?`）を定義する
  - `lib/api/inquiry-history.ts`に可変配列ストアと`getInquiryHistory(inquiryId)`・`appendInquiryHistoryEntry(entry)`を実装する
  - `getInquiryHistory`は発生時刻（`occurredAt`）の降順で返す
  - `appendInquiryHistoryEntry`で追加したエントリが直後の`getInquiryHistory`の結果に反映されることで完了とする
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _Boundary: InquiryHistoryMockApi_

- [x] 1.3 (P) テンプレートの型・モックストア・初期データを実装する
  - `types/reply-template.ts`に`ReplyTemplate`（`id`, `category`, `body`）・`CreateReplyTemplateInput`型を定義する
  - `lib/api/reply-templates.ts`に可変配列ストアと`getReplyTemplates()`・`getReplyTemplatesByCategory(category)`・`getReplyTemplateById(id)`・`createReplyTemplate(input)`・`updateReplyTemplate(id, input)`を実装する
  - カテゴリ（不良品・発注・システム・その他）ごとに最低1件の初期テンプレートを用意する
  - `getReplyTemplatesByCategory`が指定カテゴリの初期テンプレートを返すことで完了とする
  - _Requirements: 7.1, 8.1, 8.2, 8.3, 8.4_
  - _Boundary: ReplyTemplatesMockApi_

- [x] 1.4 テンプレートフォームのバリデーションスキーマを実装する
  - `lib/validation/reply-template.ts`にカテゴリ・本文の両方が必須（空文字列を拒否）な`zod`スキーマを定義する
  - カテゴリまたは本文が空の入力を渡すとバリデーションエラーになることで完了とする
  - _Requirements: 8.5_
  - _Boundary: ReplyTemplatesMockApi_
  - _Depends: 1.3_

- [x] 1.5 (P) ヘルプデスク問い合わせ管理・テンプレート管理の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に、一覧・詳細・フィルタ・対応中フラグ・履歴・返信・テンプレート管理画面用の翻訳キーを新規名前空間として追加する
  - `helpdeskNav`名前空間に「問い合わせ管理」「テンプレート管理」のキーを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 10.1, 10.2_
  - _Boundary: i18n messages_

---

- [x] 2. 基盤: Server Actionsの実装
- [x] 2.1 対応中フラグ・ステータス変更のServer Actionsを実装する
  - `lib/actions/helpdesk.ts`に`"use server"`を付与し、`claimInquiryAction(inquiryId)`・`releaseInquiryClaimAction(inquiryId)`・`changeInquiryStatusAction(inquiryId, status)`を実装する
  - 各アクションは対応する`InquiriesMockApi`のミューテーションを呼び出した後、`appendInquiryHistoryEntry`で履歴を記録し、一覧・詳細ルートを`revalidatePath`で再検証する
  - `claimInquiryAction`実行後に該当問い合わせの`claim`が`MOCK_CURRENT_STAFF_NAME`で設定され、対応履歴に記録されることで完了とする
  - _Requirements: 4.1, 4.2, 4.3, 5.2, 6.1, 6.2_
  - _Boundary: HelpdeskActions_
  - _Depends: 1.1, 1.2_

- [x] 2.2 返信送信のServer Actionを実装する
  - `lib/actions/helpdesk.ts`に`sendInquiryReplyAction(inquiryId, replyBody)`を実装する
  - 送信内容を`appendInquiryHistoryEntry`で対応履歴に記録し、詳細ルートを`revalidatePath`で再検証する
  - 返信送信後、対応履歴に送信内容を含むエントリが1件追加されることで完了とする
  - _Requirements: 5.2, 7.4_
  - _Boundary: HelpdeskActions_
  - _Depends: 1.2_

- [x] 2.3 テンプレート作成・編集のServer Actionsを実装する
  - `lib/actions/helpdesk.ts`に`createReplyTemplateAction(input)`・`updateReplyTemplateAction(id, input)`を実装する
  - `lib/validation/reply-template.ts`のスキーマでサーバー側バリデーションを行い、不正な入力は保存せずエラーを返す
  - テンプレート一覧・管理画面ルートを`revalidatePath`で再検証する
  - 新規テンプレート作成後、テンプレート一覧に追加内容が反映されることで完了とする
  - _Requirements: 8.2, 8.3, 8.4, 8.5_
  - _Boundary: HelpdeskActions_
  - _Depends: 1.3, 1.4_

---

- [x] 3. コア: 問い合わせ一覧画面
- [x] 3.1 HelpdeskInquiryListを実装する
  - `getAllInquiries()`を呼び出し、緊急度（高→中→低）優先、同一緊急度内は受付日時降順でソートして表示する
  - ローディング中はスケルトンUI、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示する
  - 一覧の各項目に会社名・国・カテゴリ・緊急度・対応状況・受付日時が表示されることで完了とする
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: HelpdeskInquiryList_

- [x] 3.2 (P) HelpdeskInquiryFilterBarを実装する
  - 会社名・キーワード・国・カテゴリを入力・選択できるフィルタUIを実装する
  - 条件をクリアする操作を提供する
  - 各入力値の変更が呼び出し元へ通知されることで完了とする
  - _Requirements: 2.1, 2.4_
  - _Boundary: HelpdeskInquiryFilterBar_

- [x] 3.3 HelpdeskInquiryListClientを実装する
  - `HelpdeskInquiryFilterBar`の条件（会社名・キーワード・国・カテゴリ）をAND条件で適用し、`HelpdeskInquiryList`が渡す問い合わせをクライアント側で絞り込んで表示する
  - キーワード条件は`originalText`への部分一致とする
  - 条件クリア時に全社分の表示に戻り、合致0件のときは該当なしメッセージを表示することで完了とする
  - _Requirements: 2.2, 2.3, 2.4, 2.5_
  - _Boundary: HelpdeskInquiryListClient_
  - _Depends: 3.1, 3.2_

- [x] 3.4 (P) HelpdeskInquiryListItemを実装する
  - 一覧の1行として、既存項目に加えて対応中フラグが立っている場合のバッジ表示を追加する
  - 対応中の問い合わせが他の問い合わせと視覚的に区別されることで完了とする
  - _Requirements: 1.3, 4.4_
  - _Boundary: HelpdeskInquiryListItem_

- [x] 3.5 問い合わせ一覧ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/inquiries/page.tsx`を新設し、`HelpdeskInquiryList`・`HelpdeskInquiryListClient`・`HelpdeskInquiryFilterBar`・`HelpdeskInquiryListItem`を結線する
  - `/[locale]/helpdesk/inquiries`にアクセスすると、緊急度優先で並んだ全社分の問い合わせとフィルタUIが表示されることで完了とする
  - _Requirements: 1.1, 11.1_
  - _Boundary: HelpdeskInquiryList, HelpdeskInquiryListClient_
  - _Depends: 3.1, 3.3, 3.4_

---

- [x] 4. コア: 問い合わせ詳細画面
- [x] 4.1 HelpdeskInquiryDetailを実装する
  - `getInquiryById`と`getInquiryHistory`を並行取得し、カテゴリ・緊急度・地域・原文・送信者情報・受付日時・対応状況を表示する
  - 存在しないIDの場合は見つからない旨のメッセージ、一覧へ戻るリンクを表示する
  - 存在するIDでアクセスすると詳細情報が表示されることで完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Boundary: HelpdeskInquiryDetail_

- [x] 4.2 (P) ClaimToggleButtonを実装する
  - 「対応中にする」「対応を外す」を切り替えるボタンを実装し、`claimInquiryAction`/`releaseInquiryClaimAction`を呼び出す
  - 対応中の場合は担当者名（`MOCK_CURRENT_STAFF_NAME`）を表示する
  - ボタン操作後、対応中の表示状態が切り替わることで完了とする
  - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - _Boundary: ClaimToggleButton_
  - _Depends: 2.1_

- [x] 4.3 (P) StatusSelectを実装する
  - 対応状況（新規・対応中・解決済み）を選択して変更できるUIを実装し、`changeInquiryStatusAction`を呼び出す
  - 選択を変更すると詳細画面の対応状況表示が更新されることで完了とする
  - _Requirements: 6.1, 6.2, 6.3_
  - _Boundary: StatusSelect_
  - _Depends: 2.1_

- [x] 4.4 (P) ReplyFormを実装する
  - 問い合わせのカテゴリに対応するテンプレート一覧（`getReplyTemplatesByCategory`）から選択して返信入力欄に挿入できるUIを実装する
  - 挿入後の文言を自由に編集できるようにし、送信時に`sendInquiryReplyAction`を呼び出す
  - テンプレートが0件のカテゴリでは選択肢が0件である状態を表示する
  - テンプレートを選択すると入力欄に文言が挿入され、送信すると対応履歴に記録されることで完了とする
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Boundary: ReplyForm_
  - _Depends: 1.3, 2.2_

- [x] 4.5 (P) HistoryTimelineを実装する
  - `getInquiryHistory`の結果を新しい順に、操作内容・操作者・操作日時とともに表示する
  - 履歴が0件のとき「対応履歴はありません」を表示する
  - 履歴が1件以上ある場合に時系列で表示されることで完了とする
  - _Requirements: 5.1, 5.3, 5.4_
  - _Boundary: HistoryTimeline_
  - _Depends: 1.2_

- [x] 4.6 問い合わせ詳細ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/inquiries/[id]/page.tsx`を新設し、`HelpdeskInquiryDetail`・`ClaimToggleButton`・`StatusSelect`・`ReplyForm`・`HistoryTimeline`を結線する
  - `/[locale]/helpdesk/inquiries/[id]`にアクセスすると、詳細情報・対応中フラグ操作・ステータス変更・返信フォーム・履歴タイムラインが全て表示されることで完了とする
  - _Requirements: 3.1, 11.1_
  - _Boundary: HelpdeskInquiryDetail_
  - _Depends: 4.1, 4.2, 4.3, 4.4, 4.5_

---

- [x] 5. コア: テンプレート管理画面
- [x] 5.1 TemplateListを実装する
  - `getReplyTemplates()`を呼び出し、カテゴリ別にグループ化して一覧表示する
  - 新規作成画面・各テンプレートの編集画面への導線を表示する
  - カテゴリごとにテンプレートが表示され、0件のカテゴリでは0件である旨が分かることで完了とする
  - _Requirements: 8.1_
  - _Boundary: TemplateList_

- [x] 5.2 TemplateFormを実装する
  - カテゴリ選択・本文入力を持つフォームを`react-hook-form`+`zod`（`lib/validation/reply-template.ts`）で実装し、新規作成・編集の両方で共用する
  - 新規作成時は`createReplyTemplateAction`、編集時は`updateReplyTemplateAction`を呼び出す
  - カテゴリまたは本文が未入力のまま送信すると送信がブロックされ、入力済みで送信すると保存されることで完了とする
  - _Requirements: 8.2, 8.3, 8.5_
  - _Boundary: TemplateForm_
  - _Depends: 1.4, 2.3_

- [x] 5.3 テンプレート管理ルート群を実装し画面を結線する
  - `app/[locale]/helpdesk/templates/page.tsx`（一覧）・`templates/new/page.tsx`（新規作成）・`templates/[id]/edit/page.tsx`（編集）を新設し、`TemplateList`・`TemplateForm`を結線する
  - 新規作成後にテンプレート一覧へ反映され、`ReplyForm`の選択肢にも反映されることで完了とする
  - _Requirements: 8.4, 11.1_
  - _Boundary: TemplateList, TemplateForm_
  - _Depends: 5.1, 5.2_

---

- [x] 6. 統合: ナビゲーションへの統合
- [x] 6.1 HelpdeskSidebarへナビゲーション項目を追加する
  - `HELPDESK_NAV_ITEMS`に「問い合わせ管理」（`/helpdesk/inquiries`）・「テンプレート管理」（`/helpdesk/templates`）の項目を追加する
  - 既存の「ホーム」項目と同様に、現在表示中のページに対応する項目がアクティブ状態で強調表示されることで完了とする
  - _Requirements: 9.1, 9.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 3.5, 5.3_

---

- [x] 7. 検証: 単体テスト・統合確認・多言語/レスポンシブ確認
- [x] 7.1 (P) 緊急度優先ソート・フィルタロジックの単体テストを実装する
  - 緊急度が高→中→低の順、同一緊急度内は受付日時降順になることを検証するテストを実装する
  - 会社名・キーワード・国・カテゴリのAND条件フィルタが正しく絞り込むことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 1.2, 2.2, 2.3_
  - _Depends: 3.1, 3.3_

- [x] 7.2 (P) 対応中フラグ・ステータス・履歴のモックAPI単体テストを実装する
  - `setInquiryClaim`・`updateInquiryStatus`が対象の`Inquiry`のみを更新することを検証するテストを実装する
  - `appendInquiryHistoryEntry`で追加した履歴が発生時刻降順で取得できることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 4.1, 4.3, 5.1, 5.2, 6.1_
  - _Depends: 1.1, 1.2, 2.1_

- [x] 7.3 (P) テンプレートバリデーションの単体テストを実装する
  - カテゴリ・本文の未入力がそれぞれバリデーションエラーになることを検証するテストを実装する
  - 正しい入力でバリデーションが通ることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 8.5_
  - _Depends: 1.4_

- [x] 7.4 (P) 対応中フラグの一覧・詳細間の同期を確認する
  - 詳細画面で対応中にした後、一覧画面に戻って対応中表示が反映されていることを確認する
  - 対応を外した後、一覧・詳細の両方で解除が反映されていることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Depends: 3.5, 4.6_

- [x] 7.5 (P) ステータス変更・返信送信が対応履歴に記録されることを確認する
  - ステータスを変更すると対応履歴に記録され、申請者側の対応状況表示にも反映されることを確認する
  - 返信を送信すると対応履歴に記録されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 5.2, 6.2, 6.3, 7.4_
  - _Depends: 4.6_

- [x] 7.6 (P) テンプレート追加内容がReplyFormへ反映されることを確認する
  - テンプレート管理画面で新規テンプレートを追加した後、対象カテゴリの問い合わせ詳細画面の`ReplyForm`に選択肢として表示されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 8.4_
  - _Depends: 4.6, 5.3_

- [x] 7.7 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで一覧・詳細・テンプレート管理画面の文言が正しく切り替わることを確認する
  - タブレット幅（768px）で新規画面が横スクロールを起こさないことを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 10.1, 10.2, 11.1_
  - _Depends: 3.5, 4.6, 5.3_

---

## 追加ラウンド（2026-07-03）: 添付ファイル対応

- [x] 8. 基盤: 添付ファイル対応の型・設定・翻訳キー
- [x] 8.1 対応履歴の型に添付ファイルフィールドを追加し、検証スキーマを再利用可能にする
  - `InquiryHistoryEntry`型に、返信の添付ファイル一覧を保持する任意フィールド（`reply_sent`エントリでのみ意味を持つ）を追加する
  - `inquiry-form`spec所有の添付ファイル検証スキーマを、他specから読み取り専用でインポートできるようにする
  - 既存の`InquiryHistoryEntry`の他フィールド・既存の対応履歴データの扱いに変更がないことで完了とする
  - _Requirements: 12.5_

- [x] 8.2 Server Actionのボディサイズ上限を引き上げる
  - 添付ファイル付きの返信を送信できるよう、Server Actionのリクエストボディサイズ上限をNext.jsの設定で明示的に引き上げる
  - 上限を引き上げた状態で`npm run build`が正常に完了することで完了とする
  - _Requirements: 12.3, 12.5_

- [x] 8.3 (P) 返信の添付ファイル関連の日本語・英語翻訳キーを追加する
  - 返信欄の添付ファイルラベル・補足文言・削除ボタン・エラーメッセージの翻訳キーを`helpdeskInquiries.reply`名前空間に追加する
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 10.1, 10.2_

---

- [x] 9. (P) AttachmentPreviewListコンポーネントを実装する
  - 添付ファイル一覧を受け取り、画像はサムネイル、それ以外はファイル名・サイズで読み取り専用のプレビューを表示する
  - 各添付ファイルをクリックしてダウンロードできるようにする
  - 添付ファイルが0件のときは何も表示しないことで完了とする
  - _Requirements: 12.1, 12.2, 12.6_
  - _Boundary: AttachmentPreviewList_
  - _Depends: 8.1_

---

- [x] 10. コア: 返信への添付ファイル統合
- [x] 10.1 返信送信のServer Actionに添付ファイルを追加する
  - `sendInquiryReplyAction`が添付ファイル一覧を受け取れるようにし、サーバー側で検証してから対応履歴のエントリに記録する
  - 添付ファイル付きで返信を送信すると、対応履歴のエントリに添付ファイルが記録されることで完了とする
  - _Requirements: 12.5_
  - _Boundary: HelpdeskActions_
  - _Depends: 8.1, 8.2_

- [x] 10.2 ReplyFormに添付ファイル欄を組み込む
  - 返信入力欄に、複数ファイルを選択できる添付ファイル欄を追加する
  - 添付ファイルを必須項目とせず、0件のままでも返信を送信できるようにする
  - 送信時に選択した添付ファイルが`sendInquiryReplyAction`へ渡されることで完了とする
  - _Requirements: 12.3, 12.4_
  - _Boundary: ReplyForm_
  - _Depends: 8.3, 10.1_

---

- [x] 11. 統合: 詳細画面・対応履歴での添付ファイル表示
- [x] 11.1 (P) 問い合わせ詳細画面に問い合わせ本文の添付ファイルを表示する
  - `HelpdeskInquiryDetail`に、問い合わせ本文の添付ファイルをプレビュー・ダウンロードできるセクションを追加する
  - 添付ファイルがある問い合わせを開くと一覧が表示され、ない場合は何も表示されないことで完了とする
  - _Requirements: 12.1, 12.2_
  - _Boundary: HelpdeskInquiryDetail_
  - _Depends: 9_

- [x] 11.2 (P) 対応履歴タイムラインに返信の添付ファイルを表示する
  - `HistoryTimeline`の返信（`reply_sent`）項目に、添付されたファイルのプレビュー・ダウンロードを追加する
  - 添付ファイル付きの返信が記録された問い合わせを開くと、履歴上でファイルを確認・ダウンロードできることで完了とする
  - _Requirements: 12.6_
  - _Boundary: HistoryTimeline_
  - _Depends: 9, 10.1_

---

- [x] 12. 検証（添付ファイル対応）
- [x] 12.1 (P) 返信の添付ファイル検証・記録のユニットテストを作成する
  - `sendInquiryReplyAction`が添付ファイルをサーバー側で検証し、不正な形状を拒否することを確認する
  - 正しい添付ファイルが対応履歴のエントリに記録されることを確認するテストが通ることで完了とする
  - _Requirements: 12.5_
  - _Depends: 10.1_

- [x] 12.2 (P) ReplyFormの添付ファイル統合テストを作成する
  - 添付ファイルを選択して送信すると`sendInquiryReplyAction`に添付ファイルが渡されることを確認する
  - 添付ファイルを選択しなくても送信がブロックされないことを確認するテストが通ることで完了とする
  - _Requirements: 12.3, 12.4_
  - _Depends: 10.2_

- [x] 12.3 (P) AttachmentPreviewList・詳細画面・履歴タイムラインの表示テストを作成する
  - 画像・非画像それぞれの添付ファイルが正しい形式で表示されることを確認する
  - 問い合わせ本文の添付・返信の添付それぞれが該当箇所に表示されることを確認するテストが通ることで完了とする
  - _Requirements: 12.1, 12.2, 12.6_
  - _Depends: 9, 11.1, 11.2_

- [ ] 12.4 * 添付ファイル対応のE2E確認を行う
  - 問い合わせ本文の添付ファイルの表示・ダウンロード、返信への添付ファイル送信・対応履歴での確認・ダウンロードを日本語・英語の両方で確認する
  - 複数ファイルを含む返信がServer Actionのボディサイズ上限に阻まれず送信できることを確認する
  - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6_
  - _Depends: 10.2, 11.1, 11.2_

---

## 追加ラウンド（2026-07-07）: 問い合わせ本文の日本語訳表示

- [x] 13. 基盤: 日本語訳ダミーデータ・翻訳キーの追加
- [x] 13.1 MOCK_INQUIRIESに日本語訳のダミー値を追加する
  - `lib/api/inquiries.ts`の`MOCK_INQUIRIES`のうち、`originalLanguage`が`ja`以外の問い合わせ全件に`translatedText`（日本語訳のダミーテキスト）を追加する
  - `originalLanguage`が`ja`の要素・既存の他フィールドは変更しない
  - 対象の全問い合わせに`translatedText`が設定されていることで完了とする
  - _Requirements: 13.5_

- [x] 13.2 (P) 日本語訳・原文ラベルの日本語・英語翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`helpdeskInquiries.detail`名前空間に、日本語訳ラベル（`translatedTextLabel`）・原文ラベル（`originalTextLabel`）を追加する
  - `ja.json`で定義したキーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 10.1, 10.2_

---

- [x] 14. HelpdeskInquiryDetailに日本語訳/原文の表示切り替えを実装する
  - 問い合わせ本文セクションの表示を、`originalLanguage`が`ja`以外かつ`translatedText`が設定されているときは日本語訳をラベル付きでメインに、原文をラベル付きで下に表示する形に変更する
  - それ以外（`originalLanguage`が`ja`、または`translatedText`未設定）のときは、ラベルなしで原文のみを表示する既存の挙動を維持する
  - 外国語原文かつ日本語訳が設定された問い合わせを開くと日本語訳が原文より上に表示され、日本語原文の問い合わせでは日本語訳ラベルが表示されないことで完了とする
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.6_
  - _Boundary: HelpdeskInquiryDetail_
  - _Depends: 13.1, 13.2_

---

- [x] 15. 検証（日本語訳表示）
- [x] 15.1 HelpdeskInquiryDetailの日本語訳/原文表示切り替えテストを作成する
  - `originalLanguage`が`ja`以外かつ`translatedText`設定済みのとき日本語訳がメイン・原文が参照として表示されることを検証する
  - `originalLanguage`が`ja`のとき日本語訳ラベルが表示されないことを検証する
  - `originalLanguage`が`ja`以外だが`translatedText`未設定のとき原文のみが表示され、エラー表示にならないことを検証するテストが通ることで完了とする
  - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - _Depends: 14_

- [x] 15.2 * 日本語訳表示のE2E確認を行う
  - 外国語原文を持つ問い合わせの詳細画面で日本語訳が原文より上に表示されること、日本語原文の問い合わせでは日本語訳セクションが表示されないことを日本語・英語の両方で確認する
  - _Requirements: 13.1, 13.2, 13.3_
  - _Depends: 15.1_

---

## 追加ラウンド（2026-07-07・2）: 対応履歴への申請者メッセージの統合表示

> 本ラウンドは`inquiry-list`spec側の「追加メッセージの送信」機能と対になっている。本specは型の追加とヘルプデスク側の表示のみを担当し、送信フォーム・Server Action自体は`inquiry-list`spec側のタスクで実装される。

- [x] 16. 基盤: InquiryHistoryEntryTypeへの種別追加・翻訳キー
- [x] 16.1 InquiryHistoryEntryTypeに"requester_message"を追加する
  - `src/types/inquiry-history.ts`の`InquiryHistoryEntryType`に`"requester_message"`を追加する。既存の4種別（`claimed`/`released`/`status_changed`/`reply_sent`）は変更しない
  - 型を追加した時点で、本spec側の`HelpdeskInquiryDetail`（`typeLabels`の網羅性）に影響がないことを確認する（`HistoryTimeline`はルックアップ方式のため影響なし）
  - `npx tsc --noEmit`が通ることで完了とする
  - _Requirements: 14.1_

- [x] 16.2 (P) 申請者メッセージ種別ラベルの日本語・英語翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`helpdeskInquiries.history.types`に`requester_message`（「申請者からのメッセージ」/"Message from requester"）を追加する
  - `ja.json`で定義したキーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 10.1, 10.2_

---

- [x] 17. HelpdeskInquiryDetailのtypeLabelsに申請者メッセージ種別を追加する
  - `HistoryTimeline`へ渡す`typeLabels`オブジェクトに`requester_message: tHistory("types.requester_message")`を追加する
  - `HistoryTimeline`自体（本spec既存コンポーネント）は変更しない
  - `requester_message`種別のエントリを持つ問い合わせを開くと、他の履歴種別と時系列で混在してラベル付きで表示されることで完了とする
  - _Requirements: 14.2, 14.3, 14.4_
  - _Boundary: HelpdeskInquiryDetail_
  - _Depends: 16.1, 16.2_

---

- [x] 18. 検証（対応履歴への申請者メッセージの統合表示）
- [x] 18.1 HelpdeskInquiryDetail・HistoryTimelineの申請者メッセージ表示テストを作成する
  - `requester_message`種別のエントリが`typeLabels`に含まれ、`HistoryTimeline`で他の種別と時系列に混在表示されることを検証する
  - `actorName`（送信元会社名）・添付ファイルが正しく表示されることを検証するテストが通ることで完了とする
  - _Requirements: 14.2, 14.3, 14.4_
  - _Depends: 17_

- [x] 18.2 * ヘルプデスク側での申請者メッセージ表示のE2E確認を行う
  - `inquiry-list`spec側の送信機能実装後、申請者側から送信した追加メッセージがヘルプデスク側の対応履歴タイムラインに反映されることを日本語・英語の両方で確認する
  - _Requirements: 14.2, 14.3, 14.4, 14.5_
  - _Depends: 18.1_

---

## 追加ラウンド（2026-07-08）: テンプレートの名称管理とテンプレート選択・一覧表示のUI改善

- [x] 19. 基盤: `ReplyTemplate`型・バリデーションへの`name`追加
- [x] 19.1 `ReplyTemplate`/`CreateReplyTemplateInput`型に`name`フィールドを追加する
  - `src/types/reply-template.ts`の`ReplyTemplate`に`name: string`を追加する（`id`→`category`→`name`→`body`の順）
  - `npx tsc --noEmit`が通ることで完了とする
  - _Requirements: 8.6_

- [x] 19.2 (P) `replyTemplateFormSchema`に`name`のバリデーションを追加する
  - `src/lib/validation/reply-template.ts`に`TEMPLATE_NAME_MAX_LENGTH`（40）定数を追加し、`name: z.string().trim().min(1).max(TEMPLATE_NAME_MAX_LENGTH)`をスキーマに追加する
  - 単体テスト（空文字・空白のみ・上限超過でエラーになること）が通ることで完了とする
  - _Requirements: 8.5, 8.6_

---

- [x] 20. モックAPI・モックデータの更新
  - `src/lib/api/reply-templates.ts`の`updateReplyTemplate`に`template.name = input.name;`を追加する
  - `MOCK_REPLY_TEMPLATES`を各カテゴリ2件程度に拡充し、全件に`name`を付与する
  - 既存の単体テスト（カテゴリごとに最低1件、作成・編集内容の反映）を`name`込みで更新し、通ることで完了とする
  - _Requirements: 8.1, 8.6_
  - _Depends: 19.1, 19.2_

---

- [x] 21. TemplateForm・関連ページの更新
  - `TemplateForm`に`name`用の`Input`フィールドを追加し、`nameLabel`/`namePlaceholder`/`nameTooLongErrorMessage`propsを追加する
  - `templates/new/page.tsx`・`templates/[id]/edit/page.tsx`のprops配線を更新する（`edit`側は`defaultValues.name`を含める）
  - `messages/ja.json`・`messages/en.json`に`nameLabel`/`namePlaceholder`/`validation.nameTooLong`を追加する
  - `name`未入力・上限超過時に送信がブロックされることを検証するテストが通ることで完了とする
  - _Requirements: 8.2, 8.3, 8.5, 8.6_
  - _Depends: 20_

---

- [x] 22. TemplateListの表示改善
  - カテゴリ見出しを`Badge`でラップし、件数（`templateCount`）を併記する
  - 各テンプレートを`name`（見出し）+`body`（`line-clamp-2`によるプレビュー）の2段組で表示する
  - 同一カテゴリに複数テンプレートがある場合にそれぞれが名前で区別されて表示されることを検証するテストが通ることで完了とする
  - _Requirements: 8.1, 8.6_
  - _Depends: 20_

---

- [x] 23. ReplyFormのテンプレート選択肢をnameベースに変更
  - `ReplyForm`のSelect optionsの`label`を`template.body`から`template.name`に変更する
  - 選択肢ラベルが`name`で表示され、選択時の本文挿入動作（既存ロジック）が変わらないことを検証するテストが通ることで完了とする
  - _Requirements: 7.6_
  - _Depends: 20_

---

- [x] 24. 検証（テンプレート名称管理・選択UI改善）
  - `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 7.6, 8.1〜8.6_
  - _Depends: 21, 22, 23_

---

## 追加ラウンド（2026-07-13）: ヘルプデスク代理問い合わせ登録・テンプレートフォームの送信エラーフィードバック

- [x] 25. 基盤: 会社一覧取得関数の追加
- [x] 25.1 `listCompaniesForHelpdesk`を実装する
  - `src/lib/server/company-service.ts`（新規、または既存のCompany関連サービスに配置）に、`Company`テーブルの全件を`name`昇順で`{ id, name, country }[]`として返す関数を実装する
  - 単体テストで、複数会社を`name`昇順で返すことを検証し、通ることで完了とする
  - _Requirements: 15.5_
  - _Boundary: ListCompaniesForHelpdesk_

---

- [x] 26. コア: 代理問い合わせ登録画面の結線
  - `/helpdesk/inquiry/new/page.tsx`を非同期Server Componentに変更し、`listCompaniesForHelpdesk()`の結果と`mode="helpdeskProxy"`を`InquiryForm`（`inquiry-form`spec 要件12）へ渡す
  - ブラウザでヘルプデスクセッションから`/helpdesk/inquiry/new`を開き、会社選択欄が表示され、会社を選択して送信すると（`UnauthorizedSessionError`が発生せず）送信が成功し、`getAllInquiries`（問い合わせ管理一覧）に選択した会社の問い合わせとして反映されることで完了とする
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.6_
  - _Boundary: HelpdeskInquiryNewPage_
  - _Depends: 25.1, inquiry-form#16.4_

---

- [x] 27. コア: テンプレートフォームの送信エラーフィードバック
- [x] 27.1 (P) 送信エラーメッセージの翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`helpdeskTemplates`名前空間に送信エラーメッセージのキーを追加する（`helpdeskAnnouncements.submitErrorMessage`と同等の文言パターン）
  - `ja.json`で定義した新規キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 8.8_
  - _Boundary: i18n messages_

- [x] 27.2 `TemplateForm`に送信エラーフィードバックを追加する
  - `AnnouncementForm`と同型の`hasSubmitError`状態・`try/catch`・`role="status"`のエラー表示・`submitErrorMessage`propを`TemplateForm`に追加する
  - `templates/new/page.tsx`・`templates/[id]/edit/page.tsx`から`submitErrorMessage`propを配線する
  - 保存操作が失敗（Server Actionのreject）したときに送信エラーメッセージが表示され、入力内容が保持されたままフォームを操作可能なことを検証する統合テストが通ることで完了とする
  - _Requirements: 8.7, 8.8_
  - _Boundary: TemplateForm_
  - _Depends: 27.1_

---

- [x] 28. 検証（代理登録・テンプレート送信エラーフィードバック）
- [x] 28.1 `tsc --noEmit`・`npm run lint`・`npm test`が全て通ることを確認する
  - _Requirements: 8.7, 8.8, 15.1〜15.6_
  - _Depends: 26, 27.2_

- [ ]* 28.2 多言語・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで会社選択欄・テンプレート送信エラーメッセージの文言が正しく切り替わることを確認する
  - タブレット幅（768px）で新規画面・エラー表示が横スクロールを起こさないことを確認する
  - _Requirements: 8.8, 15.5_
  - _Depends: 28.1_

---

## 追加ラウンド（2026-07-15）: 表示文言変更（問い合わせ管理→申請管理）の反映確認

- [x] 29. 別ブランチ（`chore/rename-inquiry-to-application-labels`）で実装済みの表示文言変更が本specの対象範囲に反映されていることを確認する
  - ヘルプデスクサイドバーの`helpdeskNav.inquiries`および問い合わせ管理一覧ページの見出し（`helpdeskInquiries.list.title`）が「申請管理」表記になっていることを`messages/ja.json`で確認する
  - 機能・データモデル（`Inquiry`型、モックAPI、対応状況の変更・返信機能等）に変更がないことを確認する
  - _Requirements: 9.3（新規）_

## 追加（2026-07-21）: 対応履歴タイムラインの視覚的表示形式（縦タイムライン）

- [x] 30. コア: 対応履歴タイムラインの縦タイムライン表示
- [x] 30.1 `src/lib/inquiry-history-style.tsx`を新規作成する（本spec所有、`inquiry-list`spec 要件15と共有）
  - `InquiryHistoryEntryType`ごとのアイコン（`lucide-react`）・配色（`globals.css`の既存トークンのみ）マッピングを定義する
  - _Requirements: 16.2, 16.5, 16.6_
- [x] 30.2 `HistoryTimeline`を縦タイムライン形式に変更する
  - `getInquiryHistoryStyle`を用いたアイコン付きマーカー・連結線、種別バッジ（既存`typeLabels`をそのまま使用）、等幅日時、返信本文のブロック表示を実装する
  - `actorName`の表示（Requirement 5.3）は既存どおり維持する
  - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - _Depends: 30.1_
- [x] 31. 検証（対応履歴タイムラインの視覚的表示形式）
- [x] 31.1 既存の`HistoryTimeline.test.tsx`が変更なしで全件成功することを確認する
  - _Requirements: 16.1〜16.6_
  - _Depends: 30.2_
- [x] 31.2 `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 16.1〜16.6_
  - _Depends: 31.1_

## 追加ラウンド（2026-07-21・2）: 一覧のステータス絞り込み・ソート見直し、タイトルの活用、返信送信時のステータス自動遷移

- [x] 32. コア: 一覧の絞り込み・ソートロジックの見直し
- [x] 32.1 `helpdesk-inquiry-list.ts`にステータス絞り込みを追加し、ソート基準・キーワード検索対象を見直す
  - `HelpdeskInquiryFilters`/`EMPTY_HELPDESK_INQUIRY_FILTERS`に`status: "" | Inquiry["status"]`を追加する
  - `filterInquiriesForHelpdesk`のキーワード判定を`title`・`originalText`のいずれかへの部分一致に変更し、`status`が指定されたときの絞り込みを追加する
  - `sortInquiriesForHelpdesk`を、対応状況（新規→対応中→解決済み）→緊急度（高→中→低）→受付日時の昇順の順で比較する形へ変更する
  - _Requirements: 1.2, 2.1, 2.3, 2.6_
  - _Boundary: HelpdeskInquiryList, HelpdeskInquiryListClient_

- [x] 32.2 (P) `HelpdeskInquiryFilterBar`に対応状況の絞り込みUIを追加する
  - `statusOptions`propを追加し、会社名・キーワード・国・カテゴリと並べて対応状況の`Select`を表示する
  - `messages/ja.json`・`messages/en.json`の`helpdeskInquiries.filter`名前空間に`statusLabel`/`statusAll`を追加する
  - _Requirements: 2.1_
  - _Boundary: HelpdeskInquiryFilterBar_
  - _Depends: 32.1_

- [x] 32.3 `HelpdeskInquiryListClient`/`HelpdeskInquiryList`に対応状況の選択肢を配線する
  - `INQUIRY_STATUS_CODES`と既存の`statusLabels`から`statusOptions`を生成し、`HelpdeskInquiryFilterBar`まで配線する
  - _Requirements: 2.1_
  - _Boundary: HelpdeskInquiryList, HelpdeskInquiryListClient_
  - _Depends: 32.2_

- [x] 32.4 (P) `HelpdeskInquiryListItem`・`HelpdeskInquiryDetail`の見出しを`title`へ変更する
  - 一覧項目の見出しリンクを`inquiry.title`に変更し、会社名・カテゴリを補足行として表示する
  - 詳細画面の`CardTitle`を`inquiry.title`に変更し、会社名・カテゴリを補足テキストとして`CardTitle`直下に表示する
  - _Requirements: 1.7, 3.5_
  - _Boundary: HelpdeskInquiryListItem, HelpdeskInquiryDetail_

- [x] 33. コア: 返信送信時のステータス自動遷移
- [x] 33.1 `updateStatusIfCurrent`/`updateInquiryStatusIfCurrent`を新設する
  - `src/lib/server/inquiry-service.ts`に、`WHERE id AND status = expectedStatus`条件付きの`prisma.inquiry.updateMany`で原子的に状態遷移する`updateStatusIfCurrent(id, expectedStatus, nextStatus): Promise<boolean>`を追加する
  - `src/lib/api/inquiries.ts`に、ヘルプデスクセッションを要求する`updateInquiryStatusIfCurrent`ラッパーを追加する
  - 既存の無条件`updateStatus`/`updateInquiryStatus`（`changeInquiryStatusAction`が使用）は変更しない
  - _Requirements: 6.4, 6.5, 7.7_
  - _Boundary: HelpdeskActions_

- [x] 33.2 `sendInquiryReplyAction`に`new`→`in_progress`の自動遷移を実装する
  - 返信の対応履歴記録後、`updateInquiryStatusIfCurrent(id, "new", "in_progress")`を呼び出す（読み取ってから無条件で書き込む方式は、他の担当者による並行変更との競合を避けるため採用しない）
  - 戻り値が`true`（実際に遷移した）のときのみ、`changeInquiryStatusAction`と同様に翻訳済みラベルの`detail`を持つ`status_changed`エントリを対応履歴に追記する
  - `in_progress`/`resolved`の問い合わせに返信しても`status`が変更されないことを維持する
  - 一覧の対応状況表示も更新されるよう、再検証対象を一覧・詳細の両方（`revalidateInquiryRoutes`）に変更する
  - _Requirements: 6.4, 6.5, 7.7_
  - _Boundary: HelpdeskActions_
  - _Depends: 33.1_

- [x] 33.3 (P) 一覧・詳細見出しの`title`空文字フォールバックを実装する
  - 実データで`inquiry.title`が空文字のケースがあることをライブ検証で確認したため、`HelpdeskInquiryListItem`・`HelpdeskInquiryDetail`に`untitledLabel`（`helpdeskInquiries.list.untitled`/`helpdeskInquiries.detail.untitled`）を用いたフォールバック表示を追加する
  - `title`が空文字のとき、アクセシブルネームのないリンクにならないようにする
  - _Requirements: 1.7, 3.5_
  - _Boundary: HelpdeskInquiryListItem, HelpdeskInquiryDetail_

- [x] 34. 検証（一覧絞り込み・ソート見直し、タイトル活用、返信時ステータス自動遷移）
- [x] 34.1 (P) `sortInquiriesForHelpdesk`/`filterInquiriesForHelpdesk`の単体テストを更新・追加する
  - 対応状況グルーピング→緊急度→受付日時昇順のソート順を検証する
  - `status`絞り込み、`title`を含むキーワード検索を検証する
  - _Requirements: 1.2, 2.1, 2.3, 2.6_
  - _Depends: 32.1_

- [x] 34.2 (P) `sendInquiryReplyAction`のステータス自動遷移の単体テストを追加する
  - 送信時点の`status`が`new`のとき`in_progress`へ変更され、`status_changed`エントリが追記されることを検証する
  - `in_progress`/`resolved`のとき`status`が変更されないことを検証する
  - _Requirements: 6.4, 6.5_
  - _Depends: 33.1_

- [x] 34.3 (P) `HelpdeskInquiryListItem`/`HelpdeskInquiryDetail`の見出し表示テストを更新する
  - 見出しに`title`が表示され、会社名・カテゴリが補足行として表示されることを検証する
  - _Requirements: 1.7, 3.5_
  - _Depends: 32.4_

- [x] 34.4 `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 1.2, 1.7, 2.1, 2.3, 2.6, 3.5, 6.4, 6.5, 7.7_
  - _Depends: 34.1, 34.2, 34.3_

---

## 追加タスク（2026-07-22）: 新規投稿の未翻訳状態の明示表示（Requirement 17 / 13.4改訂）

- [x] 35. 翻訳未対応注記のi18nキーを追加する
  - `messages/ja.json`の`helpdeskInquiries.detail`に`translationUnavailable`を追加する: 「自動翻訳は未対応です。以下の原文をご確認ください。」
  - `messages/en.json`の`helpdeskInquiries.detail`に`translationUnavailable`を追加する: "Automatic translation is not available yet. Please refer to the original text below."
  - 既存キー（`translatedTextLabel`/`originalTextLabel`/`attachmentsLabel`/`untitled`等）は変更しない
  - _Requirements: 17.5_
  - _Boundary: messages/ja.json, messages/en.json_

- [x] 36. `HelpdeskInquiryDetail`の問い合わせ本文表示分岐を3分岐へ拡張する
  - 対象: `src/components/features/helpdesk-inquiries/HelpdeskInquiryDetail.tsx` の問い合わせ本文セクション（現行の`inquiry.originalLanguage !== "ja" && inquiry.translatedText`三項分岐、L114〜138付近）
  - 分岐1（`originalLanguage !== "ja" && translatedText`が真）: 従来どおり日本語訳（`translatedTextLabel`）をメイン、原文（`originalTextLabel`）を参照として表示（変更しない）
  - 分岐2（`originalLanguage !== "ja" && !translatedText`、新規）: `t("detail.translationUnavailable")`の注記を原文の上に**補足情報として控えめに**表示（`text-sm text-muted-foreground` もしくは `bg-muted` の控えめなボックス。`--destructive`等のエラー配色は使わない）し、その下に`originalText`を表示する。注記に`translatedTextLabel`ラベルは付けない
  - 分岐3（`originalLanguage === "ja"`）: 従来どおりラベルなしで原文のみ表示（変更しない）
  - `translatedText`の真偽判定は`undefined`/`null`/空文字をすべてfalsyとして扱う（要件13.4改訂: `null`または空文字は未設定）
  - `t`は既存の`useTranslations("helpdeskInquiries")`相当（現行コードの`t`）を用いる
  - _Requirements: 13.4（改訂）, 17.1, 17.2, 17.3, 17.4, 17.6_
  - _Boundary: HelpdeskInquiryDetail_
  - _Depends: 35_

- [x] 37. `HelpdeskInquiryDetail`の表示テストを更新・追加する
  - 対象: `src/components/features/helpdesk-inquiries/HelpdeskInquiryDetail.test.tsx`
  - 既存ケース「外国語原文だが日本語訳が未設定の場合…」（L300〜329付近）を、**注記（`messages.helpdeskInquiries.detail.translationUnavailable`）が表示され、`translatedTextLabel`は表示されず、原文も表示される**ことを検証する内容に更新する
  - 既存ケース「外国語原文かつ日本語訳が設定されている場合」「原文が日本語の場合」で、注記が表示されない（`queryByText(...translationUnavailable)`が`null`）ことを併せて検証する
  - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - _Depends: 36_

- [x] 38. 検証（未翻訳注記の追加）
  - `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 13.4（改訂）, 17.1〜17.6_
  - _Depends: 35, 36, 37_

---

## 追加（2026-07-22・2）: 一覧取得の添付除外（性能）と対応中フラグ解除の所有者チェック（整合性）

- [ ] 39. コア: 一覧取得時の添付ファイル除外（性能）
- [ ] 39.1 `inquiry-service.ts`の取得includeを一覧用/詳細用に分離する
  - `INQUIRY_INCLUDE`を削除し、`INQUIRY_LIST_INCLUDE = { claimedByStaff: true }`・`INQUIRY_DETAIL_INCLUDE = { claimedByStaff: true, attachments: true }`を定義する
  - `listAllInquiries`・`listInquiriesForCompany`を`INQUIRY_LIST_INCLUDE`に、`findInquiryById`・`findInquiryForCompany`・`createInquiryRecord`・`setClaim`・`updateStatus`を`INQUIRY_DETAIL_INCLUDE`に差し替える
  - _Requirements: 18.1, 18.2, 18.3_
  - _Boundary: InquiriesMockApi (inquiry-service)_
- [ ] 39.2 `inquiry-mapper.ts`の`attachments`を任意化する
  - `PrismaInquiryWithRelations`を`Prisma.InquiryGetPayload<{ include: { claimedByStaff: true } }> & { attachments?: PrismaInquiryAttachment[] }`に変更する（`mapInquiry`本体は変更不要）
  - _Requirements: 18.1, 18.4_
  - _Boundary: inquiry-mapper_
  - _Depends: 39.1_
- [ ] 39.3 (P) `inquiry-service.test.ts`にinclude分離のテストを追加・更新する
  - 一覧関数（`listAllInquiries`・`listInquiriesForCompany`）が添付なしinclude、詳細・作成関数（`findInquiryById`・`findInquiryForCompany`・`createInquiryRecord`）が添付ありincludeで`prisma`を呼ぶことを検証する
  - `mapInquiry`が`attachments`未設定レコードで`attachments: undefined`を返すことを検証する
  - _Requirements: 18.1, 18.2, 18.5_
  - _Depends: 39.1, 39.2_

- [ ] 40. コア: 対応中フラグ解除の所有者チェック（整合性）
- [ ] 40.1 `setClaim`に所有者チェックと`ClaimOwnershipError`を追加する
  - `ClaimOwnershipError`（`inquiry-service.ts`）を新設する
  - `setClaim(id, staff, actingStaffId)`に第3引数を追加し、解除パスで`current.claimedByStaffId`が設定済みかつ`actingStaffId`と不一致のとき`ClaimOwnershipError`を送出する。未claim時は冪等な無操作、claim ON時の`DoubleClaimError`は不変
  - _Requirements: 19.1, 19.2, 19.4, 19.6_
  - _Boundary: InquiriesMockApi (inquiry-service)_
  - _Depends: 39.1_
- [ ] 40.2 呼び出し経路に`actingStaffId`を配線し、403変換を追加する
  - `src/lib/api/inquiries.ts`の`setInquiryClaim`が`claims.staffId`を`actingStaffId`として渡す
  - `src/app/api/inquiries/[id]/claim/route.ts`が`session.claims.staffId`を`setClaim`の第3引数に渡す
  - `src/lib/server/api-errors.ts`に`ClaimOwnershipError`→403の分岐を追加する
  - _Requirements: 19.1, 19.3_
  - _Boundary: InquiriesMockApi, api-errors_
  - _Depends: 40.1_
- [ ] 40.3 `releaseInquiryClaimAction`を結果オブジェクト返却に変更する
  - `ClaimOwnershipError`を捕捉して`{ ok: false, reason: "notOwner" }`を返し、`released`履歴を記録しない。成功時のみ履歴記録＋`revalidateInquiryRoutes()`し`{ ok: true }`を返す。想定外例外は再throw
  - `claimInquiryAction`は既存の例外throw方式のまま変更しない
  - _Requirements: 19.5_
  - _Boundary: HelpdeskActions_
  - _Depends: 40.1_
- [ ] 40.4 `ClaimToggleButton`に所有者不一致の専用メッセージを表示する
  - 解除結果が`notOwner`のとき`notOwnerErrorMessage`（新規prop）を表示する。既存`hasError`を`errorKind`（`null`/`"generic"`/`"notOwner"`）に置き換え、汎用/所有者不一致を出し分ける
  - `HelpdeskInquiryDetail`から`notOwnerErrorMessage`を配線する
  - `messages/ja.json`・`messages/en.json`の`helpdeskInquiries.claim.notOwnerErrorMessage`を追加する
  - 他人のclaimでもボタンは非活性化しない（design.mdのUI方針に従う）
  - _Requirements: 19.5, 19.7_
  - _Boundary: ClaimToggleButton, HelpdeskInquiryDetail_
  - _Depends: 40.3_

- [ ] 41. 検証（性能・整合性）
- [ ] 41.1 (P) claim所有者チェックのテストを追加・更新する
  - `inquiry-service.test.ts`: 所有者一致で解除、不一致で`ClaimOwnershipError`、未claim冪等を検証。既存`setClaim`呼び出しを3引数に更新
  - `inquiries.test.ts`: `setInquiryClaim`が`actingStaffId`込みで`setClaim`を呼ぶことを検証
  - `helpdesk.test.ts`: `releaseInquiryClaimAction`の戻り値・所有者不一致時に`released`履歴を記録しないことを検証
  - `claim/route.test.ts`: 3引数呼び出しへの更新、`ClaimOwnershipError`→403を検証
  - `ClaimToggleButton.test.tsx`: 所有者不一致時に専用メッセージ表示を検証
  - _Requirements: 19.1, 19.2, 19.3, 19.5_
  - _Depends: 40.2, 40.3, 40.4_
- [ ] 41.2 `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 18.1〜18.5, 19.1〜19.7_
  - _Depends: 39.3, 40.4, 41.1_
