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

- [x] 21. リンク削除確認をアプリ内モーダル（ConfirmDialog）へ置き換え、対象タイトルを明示する（2026-07-22 追記 / 要件11）
  - `DeleteLinkButton.tsx`の`window.confirm()`を廃止し、共通`ConfirmDialog`（helpdesk-portal-layout要件18）でラップ。確認押下時のみ既存削除処理を実行、`isPending`を伝播する
  - `title` prop と確認モーダル用文言propsを追加し、呼び出し側から対象タイトルを渡す
  - `helpdeskLinks.list.deleteConfirm`を`{title}`プレースホルダー付きに変更し、確認見出し・確認/キャンセルボタン文言を`messages/ja.json`・`messages/en.json`へ追加する
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Depends: helpdesk-portal-layout タスク9（ConfirmDialog新設）_

- [x]* 21.1 `DeleteLinkButton.test.tsx` をConfirmDialogベースへ更新する
  - トリガー押下→確認押下で削除実行、キャンセルで未実行、本文に対象タイトル表示を検証する
  - _Requirements: 11.6_
  - _Depends: 21_

---

## 追加タスク（追記日: 2026-07-29）: リンクカテゴリ（大分類・中分類）の階層管理とプレビュー機能

> 対応要件: 要件12〜16。設計は`design.md`「追加設計（追記日: 2026-07-29）」を参照。`documents-management`の`DocumentCategory`関連実装を参照実装とする。既存タスク1〜21.1は保持し、以下を積み増す。

### 基盤: データモデル・型・サービス層

- [x] 22. Prismaスキーマを変更する
  - `prisma/schema.prisma`に`LinkCategory`（自己参照`parentId`・`name`・`displayOrder`・`translations`・`links`・`subCategoryLinks`）・`LinkCategoryTranslation`（`categoryId`・`locale`・`name`、`@@unique([categoryId, locale])`）モデルを新設した
  - `Link`モデルの`category LinkCategory`（enum）フィールドを削除し、`categoryId`/`subCategoryId`（`String?`、`LinkCategory`への`onDelete: Restrict`参照）を追加した
  - 既存の`enum LinkCategory`（4値）を削除した
  - ローカル開発DB（Docker Compose）に対し`prisma migrate diff`でSQLを生成し`migrations/20260729083651_add_link_categories`として`prisma migrate deploy`で適用した（非対話環境のため`migrate dev`の対話プロンプトを回避）。既存`Link`行の`category`列の値は`categoryId`へ自動変換していない。`prisma/seed.ts`に大分類4件（既存4値カテゴリを引き継ぐ`LINK_CATEGORY_SEEDS`）を追加し、既存リンクseedの紐付けを更新した
  - `npx prisma generate`・`npx tsc --noEmit`が通ることを確認した
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - _Boundary: Prisma schema_

- [x] 23. (P) `LinkCategory`関連の型を定義する
  - `src/types/link-category.ts`（新規）に`LinkCategory`・`LinkCategoryAdminView`・`LinkCategoryAdminChildView`・`CreateLinkCategoryInput`・`UpdateLinkCategoryInput`・`LinkCategoryMoveDirection`・`LinkCategorySummary`（`subCategories`を含む）を定義した
  - `src/types/link.ts`の`Link`・`CreateLinkInput`を`category`（enum）から`categoryId`/`subCategoryId`ベースへ変更した。`LinkWithTimestamp`も追随させた
  - `npx tsc --noEmit`が通ることを確認した
  - _Requirements: 12.3, 12.4, 12.7_
  - _Boundary: LinkCategory型, Link型_
  - _Depends: 22_

- [x] 24. (P) カテゴリ名の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に`helpdeskLinks.categories`（一覧見出し・追加/編集/削除/並び替え操作ラベル・確認モーダル文言・0件メッセージ・エラーメッセージ）・`helpdeskLinks.categories.form.language`（言語タブUI文言）・`helpdeskLinks.list.categoryUnset`・`helpdeskLinks.list.manageCategoriesLink`を追加した
  - `links.uncategorized`（「未分類」ラベル）を追加し、不要になった`links.categories`（固定4値のカテゴリ表示名キー）を撤去した
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることを確認した
  - _Requirements: 13.14, 14.12, 16.8_
  - _Boundary: i18n messages_

- [x] 25. `link-category-service.ts`を実装する
  - `src/lib/server/link-category-service.ts`（新規）に`listLinkCategoriesForHelpdesk`・`createLinkCategoryRecord`・`updateLinkCategoryRecord`・`deleteLinkCategoryRecord`・`moveLinkCategoryRecord`・`assertLinkCategoryPair`・`getLinkCategoriesForApplicant(locale)`と、`LinkCategoryNotFoundError`・`LinkCategoryNameConflictError`・`LinkCategoryInUseError`・`LinkCategoryDepthError`・`LinkCategoryPairError`を実装した（design.md「Service Layer」参照。マッピング関数は下記タスク26で新設した`link-category-mapper.ts`を利用する）
  - 単体テストで、中分類配下への中分類作成の拒否（`LinkCategoryDepthError`）、同一階層の名称重複の拒否（`LinkCategoryNameConflictError`）、紐づくリンク・配下中分類が存在する削除の拒否（`LinkCategoryInUseError`、件数付き）、隣接レコードのみの`displayOrder`入れ替え、親子不整合の拒否（`LinkCategoryPairError`）、`getLinkCategoriesForApplicant`の名前解決を検証し、23件全て通ることを確認した
  - _Requirements: 12.2, 12.9, 13.6, 13.8, 13.9, 13.11_
  - _Boundary: LinkCategoryService_
  - _Depends: 23_

- [x] 26. (P) `resolveLinkCategoryContent`を実装する
  - 実装配置をdesign.md記載の`src/lib/link-category-utils.ts`から、参照実装（`document-category-mapper.ts`）の実際のパターンに合わせて`src/lib/server/link-category-mapper.ts`（新規）へ変更し、`mapLinkCategory`・`resolveLinkCategoryContent(category, locale)`（`locale`一致 → `en`翻訳 → 既定言語`ja`の順にフォールバック）を実装した
  - 単体テストで、各フォールバックパターンを検証し、5件全て通ることを確認した
  - _Requirements: 14.8_
  - _Boundary: resolveLinkCategoryContent_
  - _Depends: 23_

- [x] 27. カテゴリフォームのzodスキーマを実装する
  - `src/lib/validation/link-category.ts`（新規）に、既定言語（`ja`）・`en`の名称必須、追加言語コードの重複禁止を検証する`linkCategoryFormSchema`を実装した
  - `src/lib/validation/link.ts`の`linkFormSchema`を、大分類（`categoryId`）必須・中分類（`subCategoryId`）任意へ変更した（旧`category`4値enum検証を撤去）
  - 単体テストで、正常値の受理と各異常値（大分類未選択、言語コード重複、`ja`/`en`名称未入力）の拒否を検証し、通ることを確認した
  - _Requirements: 12.6, 12.10, 13.5, 14.4, 14.5, 14.11_
  - _Boundary: linkCategoryFormSchema, linkFormSchema_
  - _Depends: 23_

- [x] 28. カテゴリのServer Actionsを実装する
  - `src/lib/api/link-categories.ts`（新規、design.mdに個別記載はないが既存`api/document-categories.ts`と同一パターンで`requireHelpdeskStaffSession`によるアクセス制御を担う層として追加）と`src/lib/actions/link-categories.ts`（新規）に`"use server"`の`createLinkCategoryAction`・`updateLinkCategoryAction`・`deleteLinkCategoryAction`・`moveLinkCategoryAction`を実装した。サーバー側で`linkCategoryFormSchema`による再検証を行う
  - 各操作の最後に`/[locale]/helpdesk/links/categories`・`/[locale]/helpdesk/links`・`/[locale]/helpdesk/links/new`・`/[locale]/helpdesk/links/[id]/edit`・`/[locale]/links`を`revalidatePath`で再検証する
  - `getLinkCategoriesForApplicant`（`api/link-categories.ts`）は`LinkCategory`が公開範囲を持たないため、既存の`getLinks()`と同様に認証チェックを行わない
  - _Requirements: 13.12, 13.13_
  - _Boundary: LinkCategoryActions_
  - _Depends: 25, 27_

- [x] 29. `link-service.ts`のCRUDをカテゴリ紐付け対応へ変更する
  - `createLinkRecord`・`updateLinkRecord`（`src/lib/server/link-service.ts`）が`categoryId`（必須）・`subCategoryId`（任意）を受け取り、保存前に`assertLinkCategoryPair`で親子整合を検証するよう変更した。不整合時は保存せず例外を送出する
  - `listLinksForHelpdesk`・`findLinkById`が`categoryId`/`subCategoryId`を含めて返すよう変更した
  - 単体テストで、大分類・中分類の親子不整合での保存拒否、正常な組み合わせでの保存成功を検証し、13件全て通ることを確認した
  - _Requirements: 12.9, 12.10, 12.14_
  - _Boundary: LinkService_
  - _Depends: 25, 28_

> **実装メモ（2026-07-29、タスク22〜29担当分）**: タスク22〜29の完了条件（`tsc`/`lint`/既存テストを含む全体が通ること）を満たすため、本来はタスク30〜35の対象である以下のファイルについても、型を通すための最小限の機械的修正を行った（大分類・中分類の2段階選択UI・絞り込みUIの本格実装ではなく、暫定的に動作する状態に留めている）。後続タスク着手時にこれらを本実装へ発展させること:
> - `LinkForm.tsx`・`links/new/page.tsx`・`links/[id]/edit/page.tsx`: カテゴリSelectを大分類のみの1段Select（`getAllLinkCategories()`ベース）に変更済み。中分類Selectは未実装（タスク34）
> - `LinkManagementFilterBar.tsx`・`LinkManagementListClient.tsx`・`LinkManagementList.tsx`: カテゴリ絞り込みを大分類IDベースの1段Selectに変更済み。中分類による絞り込みは未実装（タスク35）
> - `links-page`側の`LinkList.tsx`・`LinkListClient.tsx`・`LinkCategoryGroup.tsx`（大分類のグループ化・「未分類」グループの最小実装まで対応済み。中分類サブラベル表示・`groupLinksByCategory`関数への切り出しは`links-page`タスク15・18で対応する）
> - `src/lib/constants/link-options.ts`の`LINK_CATEGORY_CODES`・`LinkManagementCategoryFilter`は撤去済み（`links-page`タスク19・本specタスク35の内容を前倒し）

### コア: カテゴリ管理画面

- [x] 30. `LinkCategoryLanguageTabs`を実装する
  - `src/components/features/helpdesk-links/LinkCategoryLanguageTabs.tsx`（新規、Client）に、固定の`ja`/`en`タブと「言語を追加」ボタンによる動的追加言語タブを実装する。各タブに名称`Input`を配置する
  - 未入力タブがあるまま送信されたとき、該当タブへ自動的に切り替えることを検証する単体テストを実装し、通ることで完了とする
  - _Requirements: 14.3, 14.4, 14.5, 14.7_
  - _Boundary: LinkCategoryLanguageTabs_
  - _Depends: 24_

- [x] 31. `LinkCategoryForm`を実装する
  - `src/components/features/helpdesk-links/LinkCategoryForm.tsx`（新規、Client）に、所属大分類（中分類作成時のみ表示・変更不可）・`LinkCategoryLanguageTabs`を持つ`react-hook-form`+`zod`フォームを実装する。大分類・中分類の追加・編集を共用する
  - _Requirements: 13.3, 13.4, 13.5, 14.3, 14.6, 14.7_
  - _Boundary: LinkCategoryForm_
  - _Depends: 27, 30_

- [x] 32. `LinkCategoryManagementList`/`LinkCategoryManagementListClient`を実装する
  - `src/components/features/helpdesk-links/LinkCategoryManagementList.tsx`（新規、Server）に`listLinkCategoriesForHelpdesk()`を取得し階層表示するコンポーネントを実装する
  - `src/components/features/helpdesk-links/LinkCategoryManagementListClient.tsx`（新規、Client）に、追加/編集フォームの開閉、`ConfirmDialog`による削除確認（対象カテゴリ名・紐づくリンク/中分類件数を明示）、「上へ」「下へ」による並び替え操作を実装する
  - 大分類が1件もないとき「カテゴリはありません」旨のメッセージを表示する
  - _Requirements: 13.1, 13.2, 13.7, 13.8, 13.9, 13.10, 13.11, 13.15_
  - _Boundary: LinkCategoryManagementList, LinkCategoryManagementListClient_
  - _Depends: 28, 31_

- [x] 33. カテゴリ管理ページを実装し、リンク管理一覧から導線を追加する
  - `src/app/[locale]/helpdesk/(dashboard)/links/categories/page.tsx`（新規）に`LinkCategoryManagementList`を配置する
  - `src/app/[locale]/helpdesk/(dashboard)/links/page.tsx`にカテゴリ管理画面への導線を追加する
  - タブレット幅（768px）で横スクロールが発生しないことを確認する
  - ブラウザで大分類・中分類の追加・編集・削除・並び替えの一連の操作が行えることで完了とする
  - _Requirements: 13.1, 13.2, 13.16_
  - _Boundary: LinkCategoryManagementPage_
  - _Depends: 32_

### コア: リンクフォーム・管理一覧のカテゴリ対応

- [x] 34. `LinkForm`のカテゴリ選択を大分類/中分類の2段Selectへ変更する
  - `src/components/features/helpdesk-links/LinkForm.tsx`のカテゴリ`Select`（4値固定）を、大分類`Select`（必須）＋中分類`Select`（選択中の大分類の`children`のみ・任意）の2段構成へ変更する
  - 大分類変更時に中分類選択をリセットする
  - 単体テストで、大分類未選択時の送信ブロック、大分類変更時の中分類リセット、中分類選択肢が選択中の大分類配下に限定されることを検証し、通ることで完了とする
  - _Requirements: 12.5, 12.6, 12.7, 12.8, 12.15_
  - _Boundary: LinkForm_
  - _Depends: 29, 32_

- [x] 35. 管理一覧に大分類名・中分類名を表示し、絞り込みを大分類/中分類ベースへ変更する
  - `src/components/features/helpdesk-links/LinkManagementList.tsx`の各行に大分類名・中分類名（未設定時は「未設定」表示）を追加する
  - `src/components/features/helpdesk-links/LinkManagementFilterBar.tsx`のカテゴリ`Select`（4値固定）を、大分類`Select`（すべて/各大分類/未設定）＋中分類`Select`（大分類選択時のみ活性・当該大分類配下に限定）の2段構成へ変更する
  - `src/components/features/helpdesk-links/LinkManagementListClient.tsx`の絞り込み状態を`categoryFilter`（大分類ID/`"all"`/`"uncategorized"`）・`subCategoryFilter`（中分類ID/`"all"`）へ変更し、大分類変更時に中分類フィルタをリセットする
  - 単体テストで、大分類絞り込み（すべて/特定/未設定）・中分類絞り込み・AND条件・条件変更時のページ先頭リセットを検証し、通ることで完了とする
  - _Requirements: 12.11, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10_
  - _Boundary: LinkManagementList, LinkManagementFilterBar, LinkManagementListClient_
  - _Depends: 34_

### コア: 申請者側プレビュー機能

- [x] 36. `getLinkCategoriesForApplicant`を`links-page`側から利用可能にする
  - `link-category-service.ts`の`getLinkCategoriesForApplicant(locale)`が、`links-page`spec所有の`groupLinksByCategory`（`src/lib/link-utils.ts`）・`/links`ページから呼び出せることを確認する（`links-page`側タスクとの依存関係）
  - _Requirements: 16.2_
  - _Boundary: LinkCategoryService_
  - _Depends: 25, 26_

- [x] 37. `LinkPreviewPanel`を実装する
  - `src/components/features/helpdesk-links/LinkPreviewPanel.tsx`（新規、Client）に、`getLinkCategoriesForApplicant`・`listLinks`から取得した実データを、`links-page`spec所有の表示コンポーネント（`groupLinksByCategory`・`LinkCategoryGroup`・`LinkItem`）へそのまま渡して描画するモーダルを実装する
  - 日本語・英語の言語切り替えタブを実装する（データ再取得は行わず、`getLinkCategoriesForApplicant`の`locale`引数を切り替えて再描画する）
  - データ取得失敗時にエラーメッセージを表示する
  - `/helpdesk/links`・`/helpdesk/links/categories`の両方に「プレビュー」ボタンを配置し、クリックで`LinkPreviewPanel`を開けるようにする
  - タブレット幅（768px）で横スクロールが発生しないことを確認する
  - ブラウザで、リンク・カテゴリを登録した状態からプレビューを開き、日英両方で申請者側の表示と一致することを確認して完了とする
  - _Requirements: 16.1, 16.3, 16.4, 16.5, 16.6, 16.7, 16.9_
  - _Boundary: LinkPreviewPanel_
  - _Depends: 33, 35, 36, links-page タスク（groupLinksByCategory実装）_

### 検証

- [x] 38. `npx tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 12.1〜16.9_
  - _Depends: 37_

- [ ]* 39. 多言語表示・レスポンシブ表示のE2E確認を行う
  - 日本語・英語両ロケールでカテゴリ管理画面・リンクフォーム・プレビューが表示され、カテゴリ名・「未分類」ラベルが正しく切り替わることを確認する
  - タブレット幅（768px）でカテゴリ管理画面・プレビューが横スクロールを起こさないことを確認する
  - _Requirements: 13.16, 16.9_
  - _Depends: 38_
