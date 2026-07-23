# 実装タスク: links-management

## 基盤: 型・バリデーション・翻訳キー

- [x] 1. `CreateLinkInput`型を追加する
  - `src/types/link.ts`に`CreateLinkInput`（`{ title: string; url: string; category: LinkCategory; description?: string }`）を追加する。既存の`Link`・`LinkCategory`は変更しない
  - `npx tsc --noEmit`が通ることで完了とする
  - _Requirements: 2.1, 3.1_
  - _Boundary: Link型定義_

- [x] 2. (P) リンクフォームのzodスキーマを実装する
  - `src/lib/validation/link.ts`（新規）に、タイトル・URLの未入力、無効なURL形式、カテゴリ未選択（4値以外）を拒否する`linkFormSchema`を実装する。`description`は任意項目として受理する
  - 単体テストで、正常値の受理と各異常値（タイトル未入力・URL未入力・無効なURL形式・カテゴリ不正）の拒否、`description`未入力での受理を検証し、通ることで完了とする
  - _Requirements: 2.2, 2.3, 2.6, 3.2, 3.3, 5.2_
  - _Boundary: linkFormSchema_

- [x] 3. (P) リンク集管理画面の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に、一覧・新規作成・編集画面の見出し・ラベル・エラーメッセージ・「リンクはありません」メッセージの翻訳キー（`helpdeskLinks`名前空間等）を追加する
  - カテゴリの表示名は`links-page`spec既存の翻訳キーを再利用し、重複定義しない
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 8.1, 8.2, 8.3_
  - _Boundary: i18n messages_

---

## コア: サービス層とServer Actions

- [x] 4. `link-service.ts`にヘルプデスク向けCRUD関数を追加する
  - `src/lib/server/link-service.ts`の既存`listLinks`はそのまま維持し、`listLinksForHelpdesk`（`createdAt`降順・`createdAt`を含む）・`getLinkById`（存在しないIDには`null`）・`createLink`・`updateLink`・`deleteLink`をPrisma経由で実装する
  - 単体テストで、`listLinksForHelpdesk`が`createdAt`降順で全件を返すこと、`getLinkById`が存在しないIDに`null`を返すこと、`createLink`/`updateLink`/`deleteLink`が対象のリンクのみを操作し他のレコードに影響しないこと（存在しないIDへの操作がエラーになること）を検証し、通ることで完了とする
  - _Requirements: 1.1, 2.4, 2.5, 3.4, 4.3, 7.1_
  - _Boundary: LinkService_
  - _Depends: 1_

- [x] 5. リンクのServer Actionsを実装する
  - `src/lib/actions/links.ts`（新規）に`"use server"`の`createLinkAction`・`updateLinkAction`・`deleteLinkAction`を実装する。`createLinkAction`/`updateLinkAction`は`linkFormSchema`でサーバー側再検証を行い、不正な入力は保存せず例外を送出する
  - 各操作の最後にヘルプデスク側一覧・編集ルートと申請者側`/links`ルートを`revalidatePath`で再検証する
  - 単体テストで、不正な入力を拒否しDBを変更しないこと、成功時に対象ルートが再検証されることを検証し、通ることで完了とする
  - _Requirements: 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 4.2, 4.3, 5.2, 7.1_
  - _Boundary: LinkActions_
  - _Depends: 2, 4_

---

## コア: UIコンポーネントとページ

- [x] 6. `LinkManagementList`を実装する
  - `src/components/features/helpdesk-links/LinkManagementList.tsx`（新規、Server）に、`listLinksForHelpdesk()`を`createdAt`降順で取得し、タイトル・URL・カテゴリ表示名・登録日を表示する一覧を実装する（既存`FaqManagementList`と同じ構造パターンを踏襲）
  - ローディング中のスケルトンUI、取得失敗時のエラーメッセージ、0件時の「リンクはありません」メッセージを表示する
  - 各項目に新規作成画面・編集画面への導線を配置する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: LinkManagementList_
  - _Depends: 4_

- [x] 7. `LinkForm`を実装する
  - `src/components/features/helpdesk-links/LinkForm.tsx`（新規、Client）に、タイトル（`Input`）・URL（`Input`）・カテゴリ（`Select`、`LinkCategory`の4値）・説明（`Textarea`、任意）を持つ`react-hook-form`+`zod`フォームを実装する。新規作成・編集を共用する
  - 未入力・無効なURL形式・カテゴリ未選択のまま保存しようとしたとき、保存操作をブロックし入力を促す
  - 単体テストで、新規作成・編集それぞれの送信データが正しいこと、未入力・無効なURL時に送信がブロックされることを検証し、通ることで完了とする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.4_
  - _Boundary: LinkForm_
  - _Depends: 2, 5_

- [x] 8. (P) `DeleteLinkButton`を実装する
  - `src/components/features/helpdesk-links/DeleteLinkButton.tsx`（新規、Client）に、クリック時に`confirm()`で確認し、確認後に`deleteLinkAction`を呼び出す削除ボタンを実装する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: DeleteLinkButton_
  - _Depends: 5_

- [x] 9. ヘルプデスク側リンク集管理ページを実装する
  - `src/app/[locale]/helpdesk/(dashboard)/links/page.tsx`（既存の閲覧専用流用画面を置き換え）に`LinkManagementList`・`DeleteLinkButton`を配置する
  - `src/app/[locale]/helpdesk/(dashboard)/links/new/page.tsx`（新規）に`LinkForm`（新規作成モード）を配置する
  - `src/app/[locale]/helpdesk/(dashboard)/links/[id]/edit/page.tsx`（新規）に`getLinkById`で取得した内容を初期値とした`LinkForm`（編集モード）と`DeleteLinkButton`を配置する。存在しないIDが指定されたときは「リンクが見つかりません」旨のメッセージを表示する
  - ブラウザで一覧→新規作成→編集→削除の一連の操作が行えることで完了とする
  - _Requirements: 1.6, 2.1, 3.1, 3.5, 4.1_
  - _Boundary: HelpdeskLinkListPage, HelpdeskLinkNewPage, HelpdeskLinkEditPage_
  - _Depends: 6, 7, 8_

- [x] 10. 既存の`HelpdeskSidebar`「リンク集」ナビゲーション項目の遷移先が管理画面になっていることを確認する
  - `HELPDESK_NAV_ITEMS`の`translationKey: "links"`項目は変更不要（既存の`/helpdesk/links`のまま）だが、その遷移先が本specのタスク9で管理画面に置き換わったことをブラウザで確認する
  - アクティブ状態のハイライトが既存の挙動から変化していないことを確認する
  - _Requirements: 6.1, 6.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 9_

---

## 検証

- [x] 11. 申請者側表示への反映を確認する
  - ヘルプデスク側でリンクを作成後、申請者側`/links`の該当カテゴリグループに表示されることを確認する
  - 編集でカテゴリを変更すると、申請者側で別グループに移動して表示されることを確認する
  - 削除後、ヘルプデスク側一覧・申請者側`/links`の両方から除去されることを確認する
  - 申請者側の表示ロジック（カテゴリ別グループ表示）自体を変更していないことを確認する
  - _Requirements: 7.1, 7.2_
  - _Depends: 9_

- [x] 12. `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 1.1〜9.1_
  - _Depends: 10, 11_

- [ ]* 13. 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで一覧・新規作成・編集画面が表示され、カテゴリ表示名が`links-page`specと同一のラベルで切り替わることを確認する
  - タブレット幅（768px）で新規画面が横スクロールを起こさないことを確認する
  - _Requirements: 8.1, 8.2, 8.3, 9.1_
  - _Depends: 12_

---

## 追加タスク（追記日: 2026-07-22）: 管理一覧の検索・絞り込み・ページネーション

> 対応要件: 要件10。設計は`design.md`「追加設計（追記日: 2026-07-22）」を参照。既存の実装済みタスク1〜13は保持し、以下を積み増す。`documents-management`の`DocumentManagementListClient`/`FilterBar`/`Pagination`を参照実装とする。

- [x] 14. 定数・フィルタ型を追加する
  - `src/lib/constants/link-options.ts` に `LINK_MANAGEMENT_PAGE_SIZE = 10` と `LinkManagementCategoryFilter = LinkCategory | "all"` 型を追加する（`document.ts`の`DOCUMENT_MANAGEMENT_PAGE_SIZE`・`DocumentManagementScopeFilter`と同一方針）
  - `npx tsc --noEmit` が通ることで完了とする
  - _Requirements: 10.3, 10.5_

- [x] 15. 管理一覧の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json` の `helpdeskLinks.list` に `filter.keywordLabel`・`filter.keywordPlaceholder`・`filter.categoryLabel`・`filter.categoryAll`・`filter.clearButton`・`filter.noResults`・`pagination.previousLabel`・`pagination.nextLabel`・`pagination.pageStatus` を追加する（`helpdeskDocuments.list.filter`/`pagination`と同構造）
  - カテゴリ表示名は`links.categories.*`を再利用し二重定義しない
  - `ja.json` で定義した新規キーが全て `en.json` にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 10.9_

- [x] 16. `LinkManagementFilterBar` を実装する
  - `src/components/features/helpdesk-links/LinkManagementFilterBar.tsx`（新規、Client）を `DocumentManagementFilterBar` と同型で実装する。`filters`（`{ keyword; category }`）・`onChange`・`onClear` を props で受け、キーワード`Input`＋カテゴリ`Select`（「すべてのカテゴリ」＋`LINK_CATEGORY_CODES`の4値）＋クリア`Button` で構成する
  - _Requirements: 10.1, 10.2, 10.3_
  - _Depends: 14, 15_

- [x] 17. `LinkManagementPagination` を実装する
  - `src/components/features/helpdesk-links/LinkManagementPagination.tsx`（新規、Client）を `DocumentManagementPagination` と同型で実装する（前へ／次へ`Button`・`pageStatus`表示、端ページで無効化）
  - _Requirements: 10.5_
  - _Depends: 15_

- [x] 18. `LinkManagementListClient` を実装し `LinkManagementList` から委譲する
  - `src/components/features/helpdesk-links/LinkManagementListClient.tsx`（新規、Client）を `DocumentManagementListClient` と同型で実装する。`filters`・`page` を状態保持し、キーワード（title・URL・description 部分一致・大文字小文字非依存）＋カテゴリのAND絞り込み・`LINK_MANAGEMENT_PAGE_SIZE`件ごとのページ分割を行う。条件変更時は1ページ目に戻す。0件時は `filter.noResults` を表示する。各行は現行と同一（タイトル・URL・カテゴリ表示名・登録日・編集リンク・`DeleteLinkButton`）とする。キーワード絞り込みは`links-page`側`src/lib/link-utils.ts`の`filterLinks`を再利用する（未実装なら同等関数を用意し最終的に集約する）
  - `src/components/features/helpdesk-links/LinkManagementList.tsx`（Server）を、一覧本体の描画を `LinkManagementListClient` 呼び出しへ置き換える形に変更する（取得・`heading`・エラー/空状態分岐・`LinkManagementListSkeleton`は維持）
  - 単体/コンポーネントテストで、キーワード絞り込み・カテゴリ絞り込み・AND条件・ページ分割・条件変更で1ページ目に戻る・0件メッセージ表示を検証し通すこと。既存`LinkManagementList.test.tsx`が壊れないことを確認する
  - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  - _Depends: 16, 17_

- [x] 19. 検証
  - `npx tsc --noEmit`・`npm run lint`・`npm test`・`npm run build` が全て通ることで完了とする
  - _Requirements: 10.1〜10.10_
  - _Depends: 18_

- [ ]* 20. 多言語・レスポンシブのE2E確認を行う
  - 日英で検索欄・カテゴリ絞り込み・ページネーションのラベルが切り替わること、タブレット幅（768px）で横スクロールが発生しないことを確認する
  - _Requirements: 10.9, 10.10_
  - _Depends: 19_

- [ ] 21. リンク削除確認をアプリ内モーダル（ConfirmDialog）へ置き換え、対象タイトルを明示する（2026-07-22 追記 / 要件11）
  - `DeleteLinkButton.tsx`の`window.confirm()`を廃止し、共通`ConfirmDialog`（helpdesk-portal-layout要件18）でラップ。確認押下時のみ既存削除処理を実行、`isPending`を伝播する
  - `title` prop と確認モーダル用文言propsを追加し、呼び出し側から対象タイトルを渡す
  - `helpdeskLinks.list.deleteConfirm`を`{title}`プレースホルダー付きに変更し、確認見出し・確認/キャンセルボタン文言を`messages/ja.json`・`messages/en.json`へ追加する
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Depends: helpdesk-portal-layout タスク9（ConfirmDialog新設）_

- [ ]* 21.1 `DeleteLinkButton.test.tsx` をConfirmDialogベースへ更新する
  - トリガー押下→確認押下で削除実行、キャンセルで未実行、本文に対象タイトル表示を検証する
  - _Requirements: 11.6_
  - _Depends: 21_
