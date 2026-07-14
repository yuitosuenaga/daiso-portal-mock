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

- [ ] 10. 既存の`HelpdeskSidebar`「リンク集」ナビゲーション項目の遷移先が管理画面になっていることを確認する
  - `HELPDESK_NAV_ITEMS`の`translationKey: "links"`項目は変更不要（既存の`/helpdesk/links`のまま）だが、その遷移先が本specのタスク9で管理画面に置き換わったことをブラウザで確認する
  - アクティブ状態のハイライトが既存の挙動から変化していないことを確認する
  - _Requirements: 6.1, 6.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 9_

---

## 検証

- [ ] 11. 申請者側表示への反映を確認する
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
