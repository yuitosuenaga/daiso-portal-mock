# 実装タスク: links-page

## 実装計画

- [x] 1. 基盤セットアップ（型定義・カテゴリ定数・モックAPI・翻訳キー）
- [x] 1.1 Link型・LinkCategory型を定義する
  - `id`・`title`・`url`・`category`・`description`（任意）を持つ`Link`型を定義する
  - カテゴリの列挙型`LinkCategory`（`"internal" | "external" | "document" | "other"`）を定義する
  - `any`型を使用せず、strict TypeScriptで全フィールドの型が明示されていることで完了とする
  - _Requirements: 2.1_

- [x] 1.2 リンクのカテゴリコード定数を定義する
  - カテゴリコード一覧を定数として定義する
  - 選択肢のコードと表示ラベルを分離し、コード一覧を1箇所変更するだけで選択肢を追加・変更できることで完了とする
  - _Requirements: 2.1, 2.4_

- [x] 1.3 リンク一覧取得のモックAPI関数を実装する
  - `lib/api/links.ts`に、リンク全件を返す関数（`getLinks`）を実装する
  - 各カテゴリに複数件のモックデータ（`title`・`url`・`category`・`description`）を用意する
  - 関数が実APIと同一の型インターフェース（引数・戻り値の型）を持ち、`Promise`を返すことで完了とする
  - _Requirements: 5.1, 5.2_

- [x] 1.4 リンク一覧ページの日本語・英語翻訳キーを追加する
  - 一覧見出し・空状態メッセージ・エラーメッセージ・カテゴリ表示名の翻訳キーを`messages/ja.json`・`messages/en.json`に追加する
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 1.3, 2.3, 4.2, 4.3, 6.1, 6.3_

---

- [x] 2. リンク項目・カテゴリグループの実装
- [x] 2.1 LinkItemコンポーネントを実装する
  - 1件のリンクをタイトル・説明・外部リンクを示すアイコン付きで表示する
  - `<a>`要素に`target="_blank"`・`rel="noopener noreferrer"`を付与し、新しいタブで安全に開けることで完了とする
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2.2 LinkCategoryGroupコンポーネントを実装する
  - カテゴリの見出し（翻訳済みラベル）と、そのカテゴリに属する`LinkItem`のリストをカード形式で表示する
  - 画面幅に応じて1カラムまたは複数カラムのレイアウトに切り替わることで完了とする
  - _Requirements: 2.2, 2.3, 7.2_
  - _Depends: 1.2, 1.4, 2.1_

---

- [x] 3. LinkListコンポーネントを実装する
  - `getLinks()`を`try/catch`で呼び出し、カテゴリコードの順に走査して該当リンクが存在するカテゴリのみ`LinkCategoryGroup`として表示する
  - データ取得中はスケルトンUI（同ファイルの`LinkListSkeleton`）、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示する
  - ブラウザで一覧を開くと、リンクが存在するカテゴリのみグループ表示され、リンクが存在しないカテゴリは表示されないことで完了とする
  - _Requirements: 1.2, 2.1, 2.2, 2.4, 4.1, 4.2, 4.3, 5.1_
  - _Depends: 1.3, 1.4, 2.2_

---

- [x] 4. リンク一覧ページにLinkListを統合する
  - `/links`ページの表示内容を、Placeholder表示から`Suspense`+`LinkListSkeleton`でラップした`LinkList`の表示に置き換える
  - タブレット幅（768px以上）で横スクロールが発生しないレイアウトにする
  - ブラウザで`/ja/links`・`/en/links`を開くと、Placeholderではなく実際のリンク一覧が表示されることで完了とする
  - _Requirements: 1.1, 7.1_
  - _Depends: 3_

---

- [ ] 5. 検証
- [x] 5.1 モックAPI関数のユニットテストを作成する
  - `getLinks`が全件の`Link`配列を返すことを検証するテストが通ることで完了とする
  - _Requirements: 5.1, 5.2_
  - _Depends: 1.3_

- [x] 5.2 LinkListの状態別表示・カテゴリグループ化の統合テストを作成する
  - 空状態・エラー状態の表示切り替えを検証する
  - リンクが存在するカテゴリのみグループ表示され、リンクが存在しないカテゴリは表示されないことを検証するテストが通ることで完了とする
  - _Requirements: 2.2, 2.4, 4.1, 4.2, 4.3_
  - _Depends: 3_

- [ ] 5.3 * レスポンシブレイアウト・多言語表示・新しいタブで開く動作のE2E確認を行う
  - タブレット幅表示時のレイアウト崩れの有無、日本語・英語切り替え時にカテゴリラベルを含む全文言が切り替わることを確認する
  - リンククリック時に新しいタブで開き、`rel="noopener noreferrer"`が付与されていることを確認する
  - 存在しない翻訳キーが英語にフォールバックされることを確認する
  - _Requirements: 3.1, 6.2, 7.1, 7.2_
  - _Depends: 4_

---

## 追加タスク（追記日: 2026-07-22）: 改行保持・更新日/新着表示・キーワード検索

> 対応要件: 要件8（改行保持）・要件9（更新日/新着）・要件10（キーワード検索）。設計は`design.md`「追加設計（追記日: 2026-07-22）」を参照。既存の実装済みタスク1〜5は保持し、以下を積み増す。

- [x] 6. 説明文の改行を保持して表示する（要件8）
  - `src/components/features/links/LinkItem.tsx` の説明文 `<p>` に `whitespace-pre-wrap` を追加する（`DocumentListItem.tsx`と同方針）。未登録時に非表示とする既存の条件分岐は維持する
  - 改行を含む説明文が改行のまま表示され、長い行がカード幅内で折り返され横スクロールが発生しないことで完了とする
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 7. 申請者側の読み取り経路に登録日（`createdAt`）を供給する（要件9）
  - `src/types/link.ts` に表示用型 `LinkWithTimestamp`（`{ ...Link; createdAt: string }`）を移設・定義する。`Link` 基底型・`CreateLinkInput` は変更しない
  - `src/lib/server/link-service.ts` の `listLinks` を `createdAt` 付き（`LinkWithTimestamp[]`、`createdAt` 降順）で返すよう変更し、`LinkWithTimestamp` は `@/types/link` から参照する（`links-management`側の参照が壊れないよう再エクスポート等で後方互換を保つ）
  - `src/lib/api/links.ts` の `getLinks()` の戻り値を `Promise<LinkWithTimestamp[]>` に変更する
  - `npx tsc --noEmit` が通り、`getLinks` が `createdAt` を含む配列を返すユニットテストが通ることで完了とする
  - _Requirements: 9.1, 9.5_

- [x] 8. 新着判定・キーワード絞り込みユーティリティを実装する（要件9・10）
  - `src/lib/link-utils.ts`（新規）に `LINK_NEW_BADGE_DAYS = 7`、`isRecentlyCreated(createdAt, now?)`、`filterLinks(links, keyword)` を実装する（`document-utils.ts` の `isRecentlyUploaded`/`filterDocuments` と同一方針。`filterLinks` は title・description・URL の部分一致・大文字小文字非依存）
  - ユニットテストで、`isRecentlyCreated` の境界（7日以内=true・未来日時=false）、`filterLinks` の空キーワードで全件・title/description/URL 部分一致・大文字小文字非依存を検証し通ることで完了とする
  - _Requirements: 9.2, 9.3, 10.2_
  - _Depends: 7_

- [x] 9. `LinkItem` に登録日・新着バッジを表示する（要件9）
  - `LinkItem` に `createdAt`・`locale`・`newBadgeLabel` props を追加し、`<time dateTime>` で登録日をロケール書式表示、`isRecentlyCreated` が true のとき `<Badge>` で新着表示する
  - `LinkCategoryGroup` を、`LinkItem` へ `locale`・`newBadgeLabel` を透過的に渡せるよう props 追加して更新する
  - _Requirements: 9.1, 9.2, 9.4_
  - _Depends: 8_

- [x] 10. キーワード検索欄と絞り込み表示を実装する（要件10）
  - `src/components/features/links/LinkSearchBar.tsx`（新規、Client）を `DocumentSearchBar` と同型で実装する（`Input`＋`Label`＋クリア`Button`、`useTranslations("links.search")`）
  - `src/components/features/links/LinkListClient.tsx`（新規、Client）を `DocumentListClient` と同型で実装する。キーワード状態を保持し、`filterLinks` で絞り込んだ結果を `LINK_CATEGORY_CODES` 順に走査し、該当リンクを持つカテゴリのみ `LinkCategoryGroup` で描画する。0件時は `links.search.noResults` を表示する
  - `src/components/features/links/LinkList.tsx`（Server）を、取得結果を `LinkListClient` へ渡す形へ変更する（空/エラー/スケルトンの既存分岐は維持）
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_
  - _Depends: 9_

- [x] 11. 翻訳キーを追加する（要件8・9・10）
  - `messages/ja.json`・`messages/en.json` の `links` 名前空間に `item.newBadge`・`search.keywordLabel`・`search.keywordPlaceholder`・`search.clearButton`・`search.noResults` を追加する
  - `ja.json` で定義した新規キーが全て `en.json` にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 9.4, 10.6_

- [x] 12. 統合テスト・検証
  - `LinkListClient` のキーワード入力で該当カテゴリのみ表示・0件メッセージ表示、`LinkItem` が改行を保持し新着バッジを条件表示することの統合テストを追加し通す
  - `npx tsc --noEmit`・`npm run lint`・`npm test`・`npm run build` が全て通ることで完了とする
  - _Requirements: 8.1, 9.1, 9.2, 10.2, 10.3, 10.4_
  - _Depends: 6, 9, 10, 11_

- [ ]* 13. 日本語・英語表示、レスポンシブ、新着バッジ・検索欄のE2E確認を行う
  - 日英で新着バッジ・検索欄ラベル・0件メッセージが切り替わること、タブレット幅で横スクロールが発生しないことを確認する
  - _Requirements: 9.4, 10.6, 10.7_
  - _Depends: 12_

---

## 追加タスク（追記日: 2026-07-29）: 大分類・中分類によるグループ表示への変更（要件11）

> 対応要件: 要件11。設計は`design.md`「追加設計（追記日: 2026-07-29）」を参照。`links-management`spec（要件12〜16、`LinkCategory`階層データモデル・`getLinkCategoriesForApplicant`・`resolveLinkCategoryContent`）の実装完了が前提となる。既存タスク1〜13は保持し、以下を積み増す。

- [x] 14. `Link`型を`categoryId`/`subCategoryId`ベースへ追随させる
  - `src/types/link.ts`の`Link`・`LinkWithTimestamp`を、`links-management`spec（タスク23）が変更した`categoryId`/`subCategoryId`ベースの定義に追随させる
  - `npx tsc --noEmit`が通ることで完了とする（既存の`category`参照箇所のコンパイルエラーは以降のタスクで解消する）
  - _Requirements: 11.1_
  - _Depends: links-management タスク23_

- [x] 15. `groupLinksByCategory`を実装する
  - `src/lib/link-utils.ts`に`groupLinksByCategory(links, categories, uncategorizedLabel)`（design.md参照）を実装する。`categories`（`links-management`提供の`LinkCategorySummary[]`）を`displayOrder`昇順に走査し、該当リンクが1件以上ある大分類のみグループ化、各リンクの中分類名を解決、末尾に「未分類」グループ（該当リンクが1件以上あるときのみ）を追加する
  - 単体テストで、displayOrder順のグループ生成、0件大分類の非表示、未分類グループの生成条件、中分類名の付与を検証し、通ることで完了とする
  - _Requirements: 11.1, 11.4, 11.5, 11.6_
  - _Boundary: groupLinksByCategory_
  - _Depends: 14, links-management タスク25_

- [x] 16. `LinkList`が`getLinkCategoriesForApplicant`を取得するよう変更する
  - `src/components/features/links/LinkList.tsx`が既存の`getLinks()`に加え、`links-management`spec提供の`getLinkCategoriesForApplicant(locale)`を`Promise.all`で並行取得し、`LinkListClient`へpropsで渡すよう変更する
  - いずれかの取得失敗も既存のエラー表示分岐に含める
  - _Requirements: 11.1_
  - _Boundary: LinkList_
  - _Depends: 15_

- [x] 17. `LinkListClient`のグループ化ロジックを`groupLinksByCategory`ベースへ変更する
  - `src/components/features/links/LinkListClient.tsx`の`LINK_CATEGORY_CODES`固定順走査を、`filterLinks`→`groupLinksByCategory`の順で適用するロジックへ変更する
  - 既存の要件8（改行保持）・要件9（新着表示）・要件10（キーワード検索）の挙動を変更しないことを確認する
  - 単体/統合テストで、大分類グループ化・中分類サブラベル・未分類グループの表示を検証し、通ることで完了とする
  - _Requirements: 11.1, 11.2, 11.7_
  - _Boundary: LinkListClient_
  - _Depends: 16_

- [x] 18. `LinkCategoryGroup`・`LinkItem`をカテゴリ表示の変更に対応させる
  - `LinkCategoryGroup`のpropsを固定カテゴリ値から解決済み`categoryName: string`を受け取る形へ変更する
  - `LinkItem`に`subCategoryName: string | null`propsを追加し、非nullのとき登録日・新着バッジと並ぶ位置にサブラベルとして表示する
  - _Requirements: 11.2, 11.3_
  - _Boundary: LinkCategoryGroup, LinkItem_
  - _Depends: 17_

- [x] 19. 翻訳キーを追加し、不要になったキー・定数を撤去する
  - `messages/ja.json`・`messages/en.json`の`links`名前空間に`uncategorized`を追加する
  - `links.categories.*`（固定4値のカテゴリ表示名キー）を撤去する
  - `src/lib/constants/link-options.ts`の`LINK_CATEGORY_CODES`・`LinkManagementCategoryFilter`を撤去する（`links-management`要件15の大分類/中分類絞り込みへの置き換えと整合させる）
  - `ja.json`で定義した新規キーが全て`en.json`にも存在することで完了とする
  - _Requirements: 11.8_
  - _Depends: 18, links-management タスク35_

- [x] 20. 検証
  - `npx tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する（確認済み。165ファイル1472件通過、ビルド成功）
  - カテゴリ管理（`links-management`側）でカテゴリを追加・並び替えたとき、`/links`のグループ順序が追随することをブラウザで確認する（`groupLinksByCategory`が`categories`のdisplayOrder順をそのまま反映する設計のためロジック上は保証されているが、実機でのブラウザ確認は未実施。次フェーズの実機検証で確認する）
  - _Requirements: 11.1〜11.8_
  - _Depends: 19_

- [ ]* 21. 多言語表示のE2E確認を行う
  - 日英切り替えで大分類名・中分類名・「未分類」ラベルが正しく切り替わることを確認する
  - _Requirements: 11.8_
  - _Depends: 20_
