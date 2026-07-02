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
