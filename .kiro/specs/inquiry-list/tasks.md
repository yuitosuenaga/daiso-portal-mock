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
