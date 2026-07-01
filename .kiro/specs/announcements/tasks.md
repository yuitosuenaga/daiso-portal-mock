# 実装タスク: announcements

## 実装計画

- [x] 1. 基盤セットアップ（型拡張・種別定数・モックAPI拡張・翻訳キー）
- [x] 1.1 Announcement型を拡張する
  - 既存の`Announcement`型（`id`/`title`/`publishedAt`）に`category`・`body`フィールドを追加する
  - 既存フィールドの型・名称を変更せず、`dashboard`仕様の`AnnouncementWidget`が参照する型と後方互換であることを確認する
  - `any`型を使用せず、strict TypeScriptで全フィールドの型が明示されていることで完了とする
  - _Requirements: 3.2, 4.1, 5.2_

- [x] 1.2 お知らせ種別（category）のコード定数を定義する
  - 種別コード（`maintenance`/`policy`/`incident`/`other`）の一覧を定数として定義する
  - 選択肢のコードと表示ラベルを分離し、コード一覧を1箇所変更するだけで選択肢を追加・変更できることで完了とする
  - _Requirements: 4.2, 4.3_

- [x] 1.3 モックAPI関数を追加する
  - `lib/api/announcements.ts`に、お知らせ全件を公開日降順で返す関数（`getAnnouncements`）を追加する
  - 同ファイルに、指定したIDのお知らせを1件返す関数（`getAnnouncementById`）を追加し、該当データが存在しない場合は`null`を解決する
  - 既存の`getRecentAnnouncements`関数のコード・型・挙動を変更しない
  - モックデータ配列の各要素に`category`・`body`を追加する（既存の`id`/`title`/`publishedAt`の値・順序は変更しない）
  - `getAnnouncements`が公開日降順で全件を返し、`getAnnouncementById`が存在しないIDに対して`null`を返すことで完了とする
  - _Requirements: 2.1, 3.3, 5.1, 5.2, 5.3_

- [x] 1.4 お知らせ一覧・詳細画面の日本語・英語翻訳キーを追加する
  - 一覧見出し・空状態・エラーメッセージ・種別ラベル・詳細画面のラベル・見つからないメッセージ・一覧へ戻るリンクの翻訳キーを`messages/ja.json`・`messages/en.json`に追加する
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 1.3, 2.3, 3.3, 6.1, 6.3_

---

- [x] 2. お知らせ種別バッジ（CategoryBadge）コンポーネントを実装する
  - 種別コードに応じて配色を切り替えるバッジ表示コンポーネントを、既存のCSS変数トークン（`--accent`/`--secondary`/`--destructive`/`--muted`）を再利用して実装する
  - 表示ラベルは呼び出し側が渡す翻訳済み文字列を使用し、コンポーネント自身は`next-intl`のフックを呼ばない
  - 4種別それぞれで視覚的に区別されることで完了とする
  - _Requirements: 4.1, 4.2_
  - _Boundary: CategoryBadge_

---

- [x] 3. お知らせ一覧の実装
- [x] 3.1 AnnouncementListItemコンポーネントを実装する
  - 1件分のお知らせのタイトル・公開日・種別バッジを表示し、タイトルから詳細画面へのリンクを設置する
  - クリックすると対応するお知らせの詳細画面へ遷移することで完了とする
  - _Requirements: 1.2, 2.1, 3.1, 4.1_
  - _Depends: 2_

- [x] 3.2 AnnouncementListコンポーネントを実装する
  - お知らせ全件を取得し、公開日降順で`AnnouncementListItem`のリストとして表示する
  - データ取得中はスケルトンUI（同ファイルの`AnnouncementListSkeleton`）、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示する
  - ブラウザで一覧を開くとお知らせが公開日降順で表示されることで完了とする
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 5.1_
  - _Depends: 1.3, 3.1_

---

- [x] 4. (P) AnnouncementDetailコンポーネントを実装する
  - 指定されたIDのお知らせを取得し、タイトル・公開日・種別バッジ・本文を表示する
  - データ取得中はスケルトンUI（同ファイルの`AnnouncementDetailSkeleton`）、取得失敗時はエラーメッセージ、該当データが存在しない（`null`）場合は見つからないメッセージを、それぞれ区別して表示する
  - 一覧ページへ戻るためのリンクを常に表示する
  - 存在するIDでは本文を含む詳細情報が表示され、存在しないIDでは見つからないメッセージが表示されることで完了とする
  - _Requirements: 3.2, 3.3, 3.4, 4.1, 5.1, 5.3_
  - _Boundary: AnnouncementDetail_
  - _Depends: 1.3, 2_

---

- [x] 5. ページ統合
- [x] 5.1 (P) お知らせ一覧ページにAnnouncementListを統合する
  - `/announcements`ページの表示内容を、Placeholder表示から`Suspense`+`AnnouncementListSkeleton`でラップした`AnnouncementList`の表示に置き換える
  - タブレット幅（768px以上）で横スクロールが発生しないレイアウトにする
  - ブラウザで`/ja/announcements`・`/en/announcements`を開くと、Placeholderではなく実際のお知らせ一覧が表示されることで完了とする
  - _Requirements: 1.1, 7.1_
  - _Boundary: AnnouncementsListPage_
  - _Depends: 3.2_

- [x] 5.2 (P) お知らせ詳細ページ（動的ルート）を新規作成する
  - `app/[locale]/announcements/[id]/page.tsx`を新規作成し、`Suspense`+`AnnouncementDetailSkeleton`でラップした`AnnouncementDetail`にURLパラメータの`id`を渡す
  - タブレット幅（768px以上）で横スクロールが発生しないレイアウトにする
  - 一覧のお知らせ項目をクリックすると詳細画面へ遷移し、内容が表示されることで完了とする
  - _Requirements: 3.1, 7.1_
  - _Boundary: AnnouncementDetailPage_
  - _Depends: 4_

---

- [ ] 6. 検証
- [x] 6.1 モックAPI関数のユニットテストを作成する
  - `getAnnouncements`が公開日降順で全件を返すことを検証する
  - `getAnnouncementById`が存在するIDでは対応するお知らせを、存在しないIDでは`null`を返すことを検証する
  - `getRecentAnnouncements`の既存の戻り値（最新3件・順序）が変更されていないことを検証するテストが通ることで完了とする
  - _Requirements: 2.1, 3.3, 5.1, 5.2, 5.3_
  - _Depends: 1.3_

- [x] 6.2 一覧・詳細コンポーネントの状態別表示の統合テストを作成する
  - `AnnouncementList`の空状態・エラー状態の表示切り替えを検証する
  - `AnnouncementDetail`の「見つからない」状態と「エラー」状態が異なるメッセージで表示されることを検証するテストが通ることで完了とする
  - _Requirements: 2.2, 2.3, 2.4, 3.3, 3.4_
  - _Depends: 3.2, 4_

- [ ] 6.3 * レスポンシブレイアウトと多言語表示のE2E確認を行う
  - タブレット幅表示時のレイアウト崩れの有無、一覧から詳細への遷移、日本語・英語切り替え時に種別ラベルを含む全文言が切り替わることを確認する
  - 存在しない翻訳キーが英語にフォールバックされることを確認する
  - _Requirements: 6.2, 6.3, 7.1_
  - _Depends: 5.1, 5.2_
