# 実装タスク: faq-management

## 基盤: 型・バリデーション・翻訳キー

- [x] 1. `CreateFaqInput`型を追加する
  - `src/types/faq.ts`に`CreateFaqInput`（`{ question: string; answer: string; category: FaqCategory }`）を追加する。既存の`Faq`・`FaqCategory`は変更しない
  - `npx tsc --noEmit`が通ることで完了とする
  - _Requirements: 2.1, 3.1_
  - _Boundary: Faq型定義_

- [x] 2. (P) FAQフォームのzodスキーマを実装する
  - `src/lib/validation/faq.ts`（新規）に、質問・回答の未入力、カテゴリ未選択（4値以外）を拒否する`faqFormSchema`を実装する
  - 単体テストで、正常値の受理と各異常値（質問未入力・回答未入力・カテゴリ不正）の拒否を検証し、通ることで完了とする
  - _Requirements: 2.2, 3.2, 5.2_
  - _Boundary: faqFormSchema_

- [x] 3. (P) FAQ管理画面の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に、一覧・新規作成・編集画面の見出し・ラベル・エラーメッセージ・「FAQはありません」メッセージの翻訳キー（`helpdeskFaq`名前空間等）を追加する
  - カテゴリの表示名は`faq`spec既存の翻訳キーを再利用し、重複定義しない
  - `HelpdeskSidebar`のナビゲーション項目用の翻訳キーも追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 6.1, 8.1, 8.2, 8.3_
  - _Boundary: i18n messages_

---

## コア: サービス層とServer Actions

- [x] 4. `faq-service.ts`にヘルプデスク向けCRUD関数を追加する
  - `src/lib/server/faq-service.ts`の既存`listFaqs`はそのまま維持し、`listFaqsForHelpdesk`（`createdAt`降順・`createdAt`を含む）・`getFaqById`（存在しないIDには`null`）・`createFaq`・`updateFaq`・`deleteFaq`をPrisma経由で実装する
  - 単体テストで、`listFaqsForHelpdesk`が`createdAt`降順で全件を返すこと、`getFaqById`が存在しないIDに`null`を返すこと、`createFaq`/`updateFaq`/`deleteFaq`が対象のFAQのみを操作し他のレコードに影響しないこと（存在しないIDへの操作がエラーになること）を検証し、通ることで完了とする
  - _Requirements: 1.1, 2.3, 2.4, 3.3, 4.3, 7.1_
  - _Boundary: FaqService_
  - _Depends: 1_

- [x] 5. FAQのServer Actionsを実装する
  - `src/lib/actions/faqs.ts`（新規）に`"use server"`の`createFaqAction`・`updateFaqAction`・`deleteFaqAction`を実装する。`createFaqAction`/`updateFaqAction`は`faqFormSchema`でサーバー側再検証を行い、不正な入力は保存せず例外を送出する
  - 各操作の最後にヘルプデスク側一覧・編集ルートと申請者側`/faq`ルートを`revalidatePath`で再検証する
  - 単体テストで、不正な入力を拒否しDBを変更しないこと、成功時に対象ルートが再検証されることを検証し、通ることで完了とする
  - _Requirements: 2.2, 2.3, 3.2, 3.3, 4.2, 4.3, 5.2, 7.1_
  - _Boundary: FaqActions_
  - _Depends: 2, 4_

---

## コア: UIコンポーネントとページ

- [x] 6. `FaqManagementList`を実装する
  - `src/components/features/helpdesk-faq/FaqManagementList.tsx`（新規、Server）に、`listFaqsForHelpdesk()`を`createdAt`降順で取得し、質問・カテゴリ表示名・登録日を表示する一覧を実装する（既存`DocumentManagementList`と同じ構造パターンを踏襲）
  - ローディング中のスケルトンUI、取得失敗時のエラーメッセージ、0件時の「FAQはありません」メッセージを表示する
  - 各項目に新規作成画面・編集画面への導線を配置する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: FaqManagementList_
  - _Depends: 4_

- [x] 7. `FaqForm`を実装する
  - `src/components/features/helpdesk-faq/FaqForm.tsx`（新規、Client）に、質問（`Input`）・回答（`Textarea`）・カテゴリ（`Select`、`FaqCategory`の4値）を持つ`react-hook-form`+`zod`フォームを実装する。新規作成・編集を共用する
  - 未入力・カテゴリ未選択のまま保存しようとしたとき、保存操作をブロックし入力を促す
  - 単体テストで、新規作成・編集それぞれの送信データが正しいこと、未入力時に送信がブロックされることを検証し、通ることで完了とする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 5.1, 5.2, 5.4_
  - _Boundary: FaqForm_
  - _Depends: 2, 5_

- [x] 8. (P) `DeleteFaqButton`を実装する
  - `src/components/features/helpdesk-faq/DeleteFaqButton.tsx`（新規、Client）に、クリック時に`confirm()`で確認し、確認後に`deleteFaqAction`を呼び出す削除ボタンを実装する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: DeleteFaqButton_
  - _Depends: 5_

- [x] 9. ヘルプデスク側FAQ管理ページを実装する
  - `src/app/[locale]/helpdesk/faq/page.tsx`（既存の閲覧専用流用画面を置き換え）に`FaqManagementList`・`DeleteFaqButton`を配置する
  - `src/app/[locale]/helpdesk/faq/new/page.tsx`（新規）に`FaqForm`（新規作成モード）を配置する
  - `src/app/[locale]/helpdesk/faq/[id]/edit/page.tsx`（新規）に`getFaqById`で取得した内容を初期値とした`FaqForm`（編集モード）と`DeleteFaqButton`を配置する。存在しないIDが指定されたときは「FAQが見つかりません」旨のメッセージを表示する
  - ブラウザで一覧→新規作成→編集→削除の一連の操作が行えることで完了とする
  - _Requirements: 1.6, 2.1, 3.1, 3.4, 4.1_
  - _Boundary: HelpdeskFaqListPage, HelpdeskFaqNewPage, HelpdeskFaqEditPage_
  - _Depends: 6, 7, 8_

- [x] 10. `HelpdeskSidebar`にFAQ管理のナビゲーション項目を追加する
  - `HELPDESK_NAV_ITEMS`に「FAQ管理」（`/helpdesk/faq`）を追加し、現在表示中のページに対応する項目をアクティブ状態で強調表示する
  - _Requirements: 6.1, 6.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 9_

---

## 検証

- [ ] 11. 申請者側表示への反映を確認する
  - ヘルプデスク側でFAQを作成後、申請者側`/faq`の該当カテゴリグループに表示されることを確認する
  - 編集でカテゴリを変更すると、申請者側で別グループに移動して表示されることを確認する
  - 削除後、ヘルプデスク側一覧・申請者側`/faq`の両方から除去されることを確認する
  - 申請者側の表示ロジック（`FaqList`・カテゴリ別グループ表示・アコーディオン）自体を変更していないことを確認する
  - _Requirements: 7.1, 7.2_
  - _Depends: 9_

- [x] 12. `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 1.1〜9.1_
  - _Depends: 10, 11_

- [ ]* 13. 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで一覧・新規作成・編集画面が表示され、カテゴリ表示名が`faq`specと同一のラベルで切り替わることを確認する
  - タブレット幅（768px）で新規画面が横スクロールを起こさないことを確認する
  - _Requirements: 8.1, 8.2, 8.3, 9.1_
  - _Depends: 12_

---

## 追加タスク: FAQ管理一覧の検索・絞り込み・ページネーション（2026-07-22 追記, 要件10）

- [ ] 14. 管理一覧用の定数を定義する（要件10.4）
  - `src/lib/constants/faq.ts`（新規）に `FAQ_MANAGEMENT_PAGE_SIZE = 10` と、必要に応じて `FaqManagementCategoryFilter = "all" | FaqCategory` 型を定義する（`document.ts` の `DOCUMENT_MANAGEMENT_PAGE_SIZE` を踏襲）
  - _Requirements: 10.4_
  - _Boundary: 定数_

- [ ] 15. `FaqManagementFilterBar` を実装する（要件10.1, 10.2, 10.7, 10.8）
  - `src/components/features/helpdesk-faq/FaqManagementFilterBar.tsx`（新規, Client）に、キーワード入力（`Input`+`Label`）・カテゴリ `Select`（`all` + `FaqCategory` 4値、ラベルは `faq.categories.*` を再利用）・クリアボタンを実装する（`DocumentManagementFilterBar` を踏襲）
  - 状態は持たず `onChange`/`onClear` で親へ通知する
  - _Requirements: 10.1, 10.2, 10.7, 10.8_
  - _Boundary: FaqManagementFilterBar_
  - _Depends: 14_

- [ ] 16. `FaqManagementPagination` を実装する（要件10.4）
  - `src/components/features/helpdesk-faq/FaqManagementPagination.tsx`（新規, Client）に、前へ／次へ（境界で `disabled`）と現在ページ／総ページ数表示を実装する（`DocumentManagementPagination` を踏襲、`helpdeskFaq.list.pagination` の翻訳キーを使用）
  - _Requirements: 10.4_
  - _Boundary: FaqManagementPagination_
  - _Depends: 14_

- [ ] 17. `FaqManagementListClient` を実装し、`FaqManagementList` を委譲構成へ変更する（要件10.1〜10.7, 10.9）
  - `src/components/features/helpdesk-faq/FaqManagementListClient.tsx`（新規, Client）に、`filters`（keyword/category）と `page` を `useState` で保持し、`filterFaqs`（`faq` spec の `src/lib/faq-utils.ts`）でキーワード絞り込み → カテゴリ一致 → `FAQ_MANAGEMENT_PAGE_SIZE` でページ分割 → 現在ページ分をスライスして描画する
  - 条件変更時に `page` を1へリセット（要件10.5）、クリアで初期状態へ（要件10.7）、0件時は `helpdeskFaq.list.filter.noResults` を表示（要件10.6）、取得時の `createdAt` 降順を維持（要件10.9）
  - `src/components/features/helpdesk-faq/FaqManagementList.tsx`（Server）を、全件取得・エラー/空状態・見出しは維持しつつ、行の直接描画をやめて取得配列と翻訳済みラベル群を `FaqManagementListClient` へ渡す構成に変更する
  - ブラウザでキーワード/カテゴリ絞り込み・ページ送り・クリアが動作することで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9_
  - _Boundary: FaqManagementListClient, FaqManagementList_
  - _Depends: 15, 16_
  - _Note: `filterFaqs` は `faq` spec のタスク10で新設。両specを同一エージェントが担当する場合は `faq` spec 側を先行させる_

- [ ] 18. 検索・ページネーションの翻訳キーを追加する（要件10.8）
  - `messages/ja.json`・`messages/en.json` の `helpdeskFaq.list` に `filter`（`keywordLabel`/`keywordPlaceholder`/`categoryLabel`/`categoryAll`/`clearButton`/`noResults`）と `pagination`（`previousLabel`/`nextLabel`/`pageStatus`）を追加する
  - カテゴリ選択肢ラベルは `faq.categories.*` を再利用し二重定義しない
  - `ja.json` の追加キーが全て `en.json` にも存在しキー構造が一致することで完了とする
  - _Requirements: 10.8_
  - _Boundary: i18n messages_

- [ ] 19. `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build` が全て通ることを確認する
  - _Requirements: 10.1〜10.9_
  - _Depends: 17, 18_

- [ ]* 20. 多言語・レスポンシブのE2E確認を行う
  - 日英で検索欄・カテゴリ・ページネーション文言が切り替わること、タブレット幅で横スクロールが発生しないことを確認する
  - _Requirements: 10.8_
  - _Depends: 19_
