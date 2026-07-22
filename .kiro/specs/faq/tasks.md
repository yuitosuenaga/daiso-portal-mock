# 実装タスク: faq

## 実装計画

- [x] 1. 基盤セットアップ（型・定数・モックAPI・アコーディオンUIプリミティブ・翻訳キー）
- [x] 1.1 FAQドメイン型とカテゴリ定数を定義する
  - `types/faq.ts`に`Faq`型（`id`/`category`/`question`/`answer`）と`FaqCategory`型を新規定義する
  - `lib/constants/faq-options.ts`にカテゴリコード一覧（`inquiry_method`/`form_input`/`status`/`other`）を定数として定義する
  - カテゴリの選択肢定義が1箇所（当該定数ファイル）の変更のみで反映できる構造になっていることで完了とする
  - _Requirements: 2.1, 2.4_

- [x] 1.2 FAQ一覧取得のモックAPI関数を実装する
  - `lib/api/faqs.ts`に、カテゴリが一通り確認できる静的モックデータ（`Faq[]`、8〜12件程度）を追加する
  - 全件を返す関数（`getFaqs`）を追加し、将来の実APIと同一の型インターフェースで差し替え可能な構造にする
  - `getFaqs`が全件の`Faq`配列を解決することで完了とする
  - _Requirements: 5.1, 5.2_

- [x] 1.3 アコーディオンUIプリミティブを導入する
  - `@radix-ui/react-accordion`を依存に追加する
  - `components/ui/accordion.tsx`に`Accordion`・`AccordionItem`・`AccordionTrigger`・`AccordionContent`を新規作成し、既存の`Card`/`Badge`と統一感のあるTailwindスタイルを適用する
  - キーボード操作（Enter/Space）で開閉が切り替わり、開閉状態に応じて`aria-expanded`が付与されることで完了とする
  - _Requirements: 3.4, 3.5_

- [x] 1.4 FAQ一覧の日本語・英語翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に`faq`名前空間（一覧見出し・空/エラーメッセージ・カテゴリ表示名）を追加する
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 1.3, 2.3, 6.1, 6.3_

---

- [x] 2. FaqAccordionコンポーネントを実装する
  - 質問配列を受け取り、質問クリックまたはキーボード操作で該当する回答の表示/非表示を切り替える
  - 各質問の展開状態を他の質問と独立して保持し、複数の質問を同時に展開できるようにする
  - 初期表示時はすべての質問を折りたたんだ状態にする
  - ブラウザで質問をクリックすると回答が表示され、別の質問をクリックしても最初の質問の展開状態が保たれることで完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.2_
  - _Depends: 1.3_
  - _Boundary: FaqAccordion_

---

- [x] 3. FaqCategoryGroupコンポーネントを実装する
  - カテゴリの表示名見出しと、当該カテゴリに属する質問群（`FaqAccordion`）を1つのグループとして表示する
  - ブラウザで一覧を開くと、同一カテゴリの質問がグループ化されカテゴリ見出し付きで表示されることで完了とする
  - _Requirements: 2.2, 2.3_
  - _Depends: 1.4, 2_

---

- [x] 4. FaqListコンポーネントを実装する
  - `getFaqs()`を`try/catch`で呼び出し、カテゴリごとに`FaqCategoryGroup`として表示する
  - データ取得中はスケルトンUI（同ファイルの`FaqListSkeleton`）、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示する
  - 該当データが1件もないカテゴリはグループ自体を表示しない
  - ブラウザで一覧を開くとカテゴリ別にグループ化されたFAQが表示されることで完了とする
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 4.1, 4.2, 4.3, 5.1_
  - _Depends: 1.1, 1.2, 1.4, 3_

---

- [x] 5. 一覧ページにFaqListを統合する
  - `/faq`ページの表示内容を、Placeholder表示から`Suspense`+`FaqListSkeleton`でラップした`FaqList`の表示に置き換える
  - タブレット幅（768px以上）でアコーディオン展開時も横スクロールが発生しないレイアウトにする
  - ブラウザで`/ja/faq`・`/en/faq`を開くと、Placeholderではなく実際のFAQ一覧が表示されることで完了とする
  - _Requirements: 1.1, 7.1, 7.2_
  - _Depends: 4_
  - _Boundary: FaqPage_

---

- [ ] 6. 検証
- [x] 6.1 モックAPI関数のユニットテストを作成する
  - `getFaqs`が全件の`Faq`配列を返すことを検証するテストが通ることで完了とする
  - _Requirements: 5.1, 5.2_
  - _Depends: 1.2_

- [x] 6.2 一覧コンポーネントの状態別表示とアコーディオン開閉の統合テストを作成する
  - `FaqList`の空状態・エラー状態の表示切り替えを検証する
  - `FaqAccordion`で質問をクリックすると回答が表示され、他の質問の開閉状態に影響しないことを検証する
  - テストが通ることで完了とする
  - _Requirements: 3.1, 3.2, 3.3, 4.2, 4.3_
  - _Depends: 4, 2_

- [ ]* 6.3 レスポンシブ・多言語・アクセシビリティのE2E確認を行う
  - タブレット幅表示時のアコーディオン展開によるレイアウト崩れの有無を確認する
  - 日本語・英語切り替え時にカテゴリ表示名を含む全文言が切り替わることを確認する
  - キーボード操作（Enter/Space）での開閉と`aria-expanded`属性の切り替わりを確認する
  - _Requirements: 3.4, 3.5, 6.2, 7.1, 7.2_
  - _Depends: 5_

---

## 追加タスク: 申請者側FAQ UX改善（2026-07-22 追記, 要件8/9/10）

- [ ] 7. 回答の改行・書式を保持して表示する（要件8）
  - `src/components/features/faq/FaqAccordion.tsx` の `AccordionContent` 内の回答表示に `whitespace-pre-wrap break-words` を付与し、改行を含む回答が複数行で表示され横スクロールが発生しないようにする（`dangerouslySetInnerHTML` は使わない）
  - 改行を含む回答データで、展開時に改行が保持されて表示されることで完了とする
  - _Requirements: 8.1, 8.2_
  - _Boundary: FaqAccordion_

- [ ] 8. `Faq` モデルに `updatedAt` を追加する（要件9.1）
  - `prisma/schema.prisma` の `Faq` モデルに `updatedAt DateTime @updatedAt` を追加する
  - 対応するPrismaマイグレーションを新規作成し、既存行の `updatedAt` を `createdAt` 相当（または実行時刻）で埋める（`NOT NULL` 追加時のバックフィル）
  - `npx prisma generate` と `npx prisma migrate dev` がローカルで通ることで完了とする。本番（Cloud SQL）への `migrate deploy` は main 統合後に別途手動実行（実装スコープ外だが申し送る）
  - _Requirements: 9.1_
  - _Boundary: prisma/schema.prisma_

- [ ] 9. 型・サービス層にタイムスタンプを露出する（要件9.2）
  - `src/types/faq.ts` の `Faq` に `createdAt: string`・`updatedAt: string` を追加し、`CreateFaqInput` を `Omit<Faq, "id" | "createdAt" | "updatedAt">` に修正する
  - `src/lib/server/faq-service.ts` の `mapFaq` の戻り値に `createdAt`/`updatedAt`（`toISOString()`）を含める（`listFaqs`・`listFaqsForHelpdesk`・`findFaqById` が自動的にタイムスタンプを返すようになる）
  - `npx tsc --noEmit` が通り、既存の `faq-management` の作成・更新・ヘルプデスク一覧テストが引き続き通ることで完了とする
  - _Requirements: 9.1, 9.2_
  - _Boundary: Faq型定義, FaqService_
  - _Depends: 8_

- [ ] 10. FAQユーティリティ（新着判定・キーワード絞り込み）を実装する（要件9.3, 9.5, 10.2）
  - `src/lib/faq-utils.ts`（新規）に `FAQ_NEW_BADGE_DAYS`（既定7）・`isRecentlyUpdated(updatedAt, now?)`・`filterFaqs(faqs, keyword)` を実装する（`document-utils.ts` の `isRecentlyUploaded`/`filterDocuments` を踏襲）
  - `filterFaqs` は `question`・`answer` の部分一致（trim + 大文字小文字非依存）、空キーワードは全件返却
  - 単体テストで、`isRecentlyUpdated`（7日ちょうど=true・7日超=false・未来日=false）と `filterFaqs`（空=全件・question一致・answer一致・0件）を検証し通ることで完了とする
  - _Requirements: 9.3, 9.5, 10.2, 10.3_
  - _Boundary: faq-utils_

- [ ] 11. `FaqAccordion` に更新日・新着バッジを表示する（要件9.2, 9.3, 9.4）
  - 各質問に更新日（`updatedAt` をロケール書式で整形）を表示し、`isRecentlyUpdated` が真のとき既存 `Badge` で「新着」を表示する
  - ラベル・バッジ文言は `faq.list.updatedLabel`・`faq.list.newBadge` の翻訳キー経由で提供する（ja/en 追加）
  - ブラウザで最近更新したFAQに新着バッジと更新日が表示されることで完了とする
  - _Requirements: 9.2, 9.3, 9.4_
  - _Boundary: FaqAccordion_
  - _Depends: 9, 10_

- [ ] 12. 申請者側キーワード検索（`FaqListClient`）を実装する（要件10）
  - `src/components/features/faq/FaqListClient.tsx`（新規, Client）に、キーワード入力欄（`Input`+`Label`）と `useState` による検索状態、`filterFaqs` による絞り込み、`FAQ_CATEGORY_CODES` によるカテゴリ別グループ化（`FaqCategoryGroup` へ委譲）を実装する
  - `FaqList`（Server）からグループ化ループを `FaqListClient` へ移設し、`FaqList` は取得・エラー/空状態ハンドリングと正常系配列の受け渡しに専念する
  - 絞り込み結果0件のとき `faq.search.noResults` を表示し、空カテゴリグループは非表示にする
  - 検索欄ラベル・プレースホルダ・0件・クリアボタンは `faq.search.*` 翻訳キー経由（ja/en 追加）
  - ブラウザでキーワード入力により該当FAQのみがカテゴリ別に表示され、0件時にメッセージが出ることで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - _Boundary: FaqListClient, FaqList_
  - _Depends: 10_

- [ ] 13. 翻訳キーを追加する（要件9.4, 10.5）
  - `messages/ja.json`・`messages/en.json` の `faq` 名前空間に `list.updatedLabel`・`list.newBadge`・`search.label`・`search.placeholder`・`search.noResults`・`search.clearButton` を追加する
  - `ja.json` で追加した全キーが `en.json` にも存在しキー構造が一致することで完了とする
  - _Requirements: 9.4, 10.5_
  - _Boundary: i18n messages_

- [ ] 14. `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build` が全て通ることを確認する
  - _Requirements: 8.1〜10.6_
  - _Depends: 7, 11, 12, 13_

- [ ]* 15. 多言語・レスポンシブ・改行表示のE2E確認を行う
  - 日英で更新日・新着バッジ・検索欄・0件メッセージが切り替わることを確認する
  - 改行を含む回答が複数行で表示されること、タブレット幅で横スクロールが発生しないことを確認する
  - _Requirements: 8.2, 9.4, 10.5_
  - _Depends: 14_
