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
  - _Depends: 13.1_
