# 実装タスク: documents

## 実装計画

> 前提: `documents-management`spec が所有する`Document`/`DocumentTargeting`型、および`lib/api/documents.ts`の`getDocuments`/`getDocumentById`が実装済みであること（実装順序は`documents-management`を先行させる）。

- [x] 1. 基盤: 翻訳キーの追加
- [x] 1.1 ドキュメント一覧・詳細の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に一覧・詳細画面用の翻訳キーを新規名前空間（`documents`）として追加する
  - `nav`名前空間に「ドキュメント」のキーを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 7.1, 7.2_
  - _Boundary: i18n messages_

---

- [x] 2. コア: ドキュメント一覧・詳細画面
- [x] 2.1 DocumentList・DocumentListItemを実装する
  - `getDocuments()`を呼び出し、アップロード日降順で一覧表示する`DocumentList`（+スケルトン）を実装する
  - `DocumentListItem`にタイトル・説明・`formatFileSize(fileSize)`・アップロード日、詳細ページへの「表示」リンク、`<a href={dataUrl} download={fileName}>`の「ダウンロード」リンクを実装する
  - ローディング中はスケルトンUI、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示することで完了とする
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 5.1, 5.3_
  - _Boundary: DocumentList_

- [x] 2.2 (P) PdfViewerを実装する
  - `<iframe src={dataUrl} title={title}>`をビューポート高さに応じたコンテナ（`h-[70vh] lg:h-[80vh]`程度）に配置し、iframeの外側に独立したダウンロードリンク（`<a href={dataUrl} download={fileName}>`）を常設する
  - `title`属性にドキュメントのタイトルを設定する
  - iframe内にPDFが表示され、ダウンロードリンクが独立して機能することで完了とする
  - _Requirements: 4.3, 4.4, 5.2, 5.3, 8.2_
  - _Boundary: PdfViewer_

- [x] 2.3 DocumentDetailを実装する
  - `getDocumentById(id)`を呼び出し、見つからない/エラー/成功の3状態を管理する（+スケルトン）
  - 成功時はタイトル・説明・ファイルサイズ・アップロード日を表示し、`PdfViewer`にドキュメント情報を渡す
  - 一覧ページへ戻るリンクを表示する
  - 存在しない、または自社に非公開のIDに対して「見つからない」旨のメッセージを表示することで完了とする
  - _Requirements: 2.5, 4.1, 4.2, 4.5, 4.6_
  - _Boundary: DocumentDetail_
  - _Depends: 2.2_

- [x] 2.4 ドキュメント一覧ルートを実装し画面を結線する
  - `app/[locale]/(applicant)/documents/page.tsx`を新設し、`DocumentList`を結線する
  - `/[locale]/documents`にアクセスすると自社に公開されたドキュメント一覧が表示されることで完了とする
  - _Requirements: 1.1, 8.1_
  - _Boundary: DocumentList_
  - _Depends: 2.1_

- [x] 2.5 (P) ドキュメント詳細ルートを実装し画面を結線する
  - `app/[locale]/(applicant)/documents/[id]/page.tsx`を新設し、`DocumentDetail`を結線する
  - 一覧の「表示」リンクから遷移すると詳細ページでPDFが閲覧できることで完了とする
  - _Requirements: 4.1, 8.1, 8.2_
  - _Boundary: DocumentDetail_
  - _Depends: 2.3_

---

- [x] 3. 統合: ナビゲーションへの統合
- [x] 3.1 Sidebarへナビゲーション項目を追加する
  - `NavItem`の`translationKey`Unionに`"documents"`を追加し、`NAV_ITEMS`に「ドキュメント」（`/documents`）の項目を追加する
  - 既存項目と同様に、現在表示中のページに対応する項目がアクティブ状態で強調表示されることで完了とする
  - _Requirements: 1.1_
  - _Boundary: Sidebar_
  - _Depends: 2.4_

---

- [x] 4. 検証: 単体テスト・統合確認・多言語/レスポンシブ確認
- [x] 4.1 (P) DocumentListItem・PdfViewerの単体テストを実装する
  - `DocumentListItem`がタイトル・説明・ファイルサイズ・日付・表示/ダウンロードリンクを正しく描画することを検証するテストを実装する
  - `PdfViewer`が`<iframe>`に`src`/`title`を正しく設定し、ダウンロードリンクを併設することを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 1.2, 4.3, 4.4, 5.1, 5.2_
  - _Depends: 2.1, 2.2_

- [x] 4.2 (P) 公開範囲による可視性制御を確認する
  - `documents-management`側で異なる公開範囲（全体公開／国単位／販社単位）のドキュメントを用意し、自社に公開されるものだけが一覧・詳細に表示されることを確認する
  - 自社に非公開のドキュメントIDへ直接アクセスすると「見つからない」旨が表示されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Depends: 2.4, 2.5_

- [x] 4.3 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで一覧・詳細画面の文言が正しく切り替わることを確認する
  - タブレット幅（768px）で一覧・詳細画面が横スクロールを起こさないことを確認する
  - 詳細ページのPDF表示領域がビューポート高さに応じて十分な縦幅を確保していることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 7.1, 7.2, 8.1, 8.2_
  - _Depends: 2.4, 2.5_

---

- [x] 5. 見出し（h1 + 説明文）の統一（2026-07-08 追記）
  - `DocumentList.tsx`に、`LinkList.tsx`/`FaqList.tsx`と同一の`h1`＋説明文の`heading`要素を追加し、`Card`の外側・上部に配置する（既存の`documents.list.title`/`.description`翻訳キーをそのまま使用）
  - エラー時・空データ時の早期returnにも同じ`heading`を含める
  - 観測可能な完了条件: `/documents`を開くと、リンク集・FAQページと同じスタイルの`h1`タイトルと説明文がカードの上部に表示される
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - _Boundary: DocumentList_

---

- [x] 6. 一覧ページへのPDFプレビュー統合（2026-07-09 追記）
- [x] 6.1 PdfViewerの高さをグリッド向けに調整する
  - `PdfViewer.tsx`の`<iframe>`コンテナの高さを`h-[70vh] lg:h-[80vh]`から2列グリッドの1セル幅を想定した高さ（`h-[50vh]`程度、`min-h`確保）に変更する
  - 既存の単体テストがパスすることで完了とする
  - _Requirements: 10.1, 10.2, 11.2_
  - _Boundary: PdfViewer_

- [x] 6.2 DocumentListItemにPdfViewerをインライン統合し、詳細ページへのリンクを削除する
  - `DocumentListItem`から詳細ページ（`/documents/[id]`）への「表示」リンクを削除し、タイトル・説明・メタ情報の直下に`PdfViewer`を配置する（ダウンロードリンクは`PdfViewer`が提供するもので代替し、重複するリンクを持たない）
  - 各カードが独立した`Card`として構成されることで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - _Boundary: DocumentListItem_
  - _Depends: 6.1_

- [x] 6.3 DocumentListを2列グリッドレイアウトに変更する
  - `ul.divide-y`構成をやめ、`DocumentListItem`を`grid grid-cols-1 md:grid-cols-2 gap-6`のグリッドに配置する（見出しの`h1`+説明文は変更しない）
  - 768px未満で1列表示に切り替わり、768px以上で2列グリッドが横スクロールなく表示されることで完了とする
  - _Requirements: 11.1, 11.3, 11.4_
  - _Boundary: DocumentList_
  - _Depends: 6.2_

- [x] 6.4 一覧ページのコンテナ幅を拡張する
  - `app/[locale]/(applicant)/documents/page.tsx`のコンテナ幅を、2列グリッドが画面全体を活かして表示できる幅に変更する
  - 2列グリッドが画面全体を使って表示されることで完了とする
  - _Requirements: 11.2_
  - _Boundary: DocumentList_
  - _Depends: 6.3_

- [x] 6.5 詳細ページ関連の削除と翻訳キーの整理
  - `app/[locale]/(applicant)/documents/[id]/page.tsx`、`DocumentDetail.tsx`（および対応するテスト）を削除する
  - `messages/ja.json`・`messages/en.json`から`documents.list.viewLink`・`documents.detail`名前空間を削除する（`en.json`にも同様の変更を行い、キー構造の一致を保つ）
  - 型チェック・既存テストが通ることで完了とする
  - _Requirements: 10.5_
  - _Boundary: i18n messages_
  - _Depends: 6.4_

- [x] 6.6 (P) 一覧ページのテストを更新する
  - `DocumentListItem`のテストを、インラインPdfViewerの描画・ダウンロードリンクの動作を検証する内容に更新する
  - `DocumentList`のテストを、2列グリッドでの表示・0件時の空状態表示に追従させる
  - 全テストがパスすることで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.1_
  - _Depends: 6.5_

---

## 追加ラウンド（2026-07-13）: 書類一覧の検索

- [x] 7. 基盤: 検索用の翻訳キーとフィルタ純関数
- [x] 7.1 検索の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に`documents.search`名前空間（検索欄プレースホルダー・クリア操作・0件時メッセージ）を追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 12.7_
  - _Boundary: i18n messages_

- [x] 7.2 (P) 書類一覧のフィルタ純関数を実装する
  - `src/lib/document-utils.ts`（既存の`targetingLabel`等と同じユーティリティファイル）に、キーワード（`title`・`description`の部分一致・大小文字無視）で`Document[]`を絞り込む`filterDocuments`純関数を実装する
  - キーワードが空のとき入力配列をそのまま（アップロード日降順の順序を維持して）返すことで完了とする
  - _Requirements: 12.2, 12.6_
  - _Boundary: filterDocuments_

---

- [x] 8. コア: 検索UIとクライアント側一覧を実装し一覧ページに結線する
  - キーワード入力欄・クリアボタンを表示する`DocumentSearchBar`と、キーワード状態を保持し絞り込み済みの2列グリッドを描画する`DocumentListClient`を実装する
  - 既存の`DocumentList`をデータ取得専用のサーバーコンポーネントに整理し、見出し（`h1`＋説明文）は維持したまま、グリッド描画を`DocumentListClient`へ委譲する
  - クリア操作で条件を解除できる。絞り込み結果が0件のとき「該当するドキュメントがありません」を表示し、絞り込み後もアップロード日降順・2列グリッドのレイアウトを維持する
  - ブラウザで`/documents`を開き、キーワードを入力すると一覧が即時に絞り込まれることで完了とする
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  - _Boundary: DocumentSearchBar, DocumentListClient, DocumentList_
  - _Depends: 7.1, 7.2_

---

- [x] 9. 検証: 単体テスト・多言語/レスポンシブ確認
- [x] 9.1 (P) フィルタ純関数の単体テストを実装する
  - `filterDocuments`がタイトル・説明の部分一致（大小文字無視）で絞り込むこと、キーワードが空のとき全件を返すことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 12.2, 12.6_
  - _Depends: 7.2_

- [x]* 9.2 (P) 検索UIの統合テストを実装する
  - キーワードを入力すると一覧が絞り込まれ、クリアで全件表示に戻ること、0件時にメッセージが表示されることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 12.1, 12.3, 12.4, 12.5_
  - _Depends: 8_

- [ ] 9.3 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで検索欄のラベル・0件メッセージが正しく切り替わることを確認する
  - タブレット幅（768px）で検索欄が横スクロールを起こさないことを確認する
  - _Requirements: 12.7_
  - _Depends: 8_

---

## 追加ラウンド（2026-07-16）: Googleドキュメント埋め込みのライブ表示

> 前提: `documents-management`spec が`Document`型を`sourceType`による判別可能ユニオン型に変更し、`sourceType: "google"`時に`googleUrl`・`googleEmbedUrl`を提供済みであること（実装順序は`documents-management`の該当タスクを先行させる）。

- [x] 10. Googleドキュメント埋め込みのライブ表示
- [x] 10.1 PdfViewerのpropsをバリアントによる判別可能ユニオン型に変更する
  - `PdfViewer`のpropsを、アップロード方式（`dataUrl`・`title`・ダウンロードファイル名・ダウンロードリンクラベル）とGoogle方式（埋め込みURL・`title`・元のURL・「元のドキュメントを開く」リンクラベル）の判別可能ユニオン型に変更する
  - アップロード方式は既存通り`dataUrl`をiframeの`src`に設定しダウンロードリンクを表示し、Google方式は埋め込みURLをiframeの`src`に設定し、元のURLを新しいタブで開くリンクを表示するよう実装を分岐する
  - 両方式ともiframeの`title`属性にドキュメントタイトルが設定されることで完了とする
  - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - _Boundary: PdfViewer_

- [x] 10.2 (P) Google埋め込み関連の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`documents.list`に「元のドキュメントを開く」リンクラベルのキーを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在することで完了とする
  - _Requirements: 13.4_
  - _Boundary: i18n messages_

- [x] 10.3 DocumentListItemをsourceType分岐に対応させる
  - ドキュメントの`sourceType`に応じて、`PdfViewer`へ渡すpropsをアップロード方式（`dataUrl`等）またはGoogle方式（埋め込みURL・元URL等）に分岐させる
  - `sourceType`が`"upload"`と`"google"`で混在する一覧で、それぞれのカードが正しいプレビュー・リンクを表示することで完了とする
  - _Requirements: 13.1, 13.2_
  - _Boundary: DocumentListItem_
  - _Depends: 10.1, 10.2_

- [x] 10.4 (P) sourceType混在時の検索・グリッド・並び順を確認する
  - `sourceType`が`"upload"`と`"google"`で混在するドキュメント一覧で、検索によるキーワード絞り込み・2列グリッドレイアウト・アップロード日降順の並び順が`sourceType`によらず同様に機能することを確認する
  - Google埋め込みが表示できない場合（権限不足等）に、本specとして追加のエラーハンドリングを行わずブラウザの標準動作に委ねていることをコードレビューで確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 13.5, 13.6_
  - _Depends: 10.3_

- [x] 10.5 (P) PdfViewerの単体テストを更新する
  - `PdfViewer`がGoogle方式のとき埋め込みURLをiframeの`src`に設定し、ダウンロードリンクの代わりに元のURLを新しいタブで開くリンクを描画することを検証するテストを追加する
  - `DocumentListItem`がドキュメントの`sourceType`に応じて正しいバリアントのpropsを`PdfViewer`へ渡すことを検証するテストを追加する
  - 全テストがパスすることで完了とする
  - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - _Depends: 10.3_

---

## 追加ラウンド（2026-07-22）: 一覧のプレビュー性能・表示品質の改善

- [x] 11. 一覧のプレビュー性能・表示品質を改善する

- [x] 11.1 プレビューiframeに遅延読み込みを付与する（性能改善）
  - `PdfViewer`の`<iframe>`（`variant: "upload"`・`variant: "google"`の両方）に`loading="lazy"`属性を付与する
  - 付与後も要件10.1（クリック操作なしのプレビュー）・10.2（`title`属性）・11（2列グリッド/レスポンシブ）・13（sourceType分岐）の挙動が維持されること、ダウンロードリンク等のメタ情報が従来どおり即時表示されることをコードレビューで確認することで完了とする
  - _Requirements: 14.1, 14.2, 14.3_
  - _Boundary: PdfViewer_

- [x] 11.2 (P) 説明文の改行を保持する
  - `DocumentListItem`の説明（`description`）表示`<p>`に`whitespace-pre-wrap`を付与する
  - `description`未設定時は説明要素を描画しない既存の条件付き描画を維持する
  - 複数行の説明が改行を保ったまま表示されることで完了とする
  - _Requirements: 15.1, 15.2_
  - _Boundary: DocumentListItem_

- [x] 11.3 新着判定ユーティリティと基準日数定数を追加する
  - `src/lib/document-utils.ts`に基準日数定数（例: `DOCUMENT_NEW_BADGE_DAYS = 7`）と`isRecentlyUploaded(uploadedAt: string, now?: Date): boolean`を追加する
  - `now`引数を任意で受け取れるようにし、基準期間内は`true`・期間外は`false`を返すことで完了とする
  - _Requirements: 16.2, 16.3_
  - _Boundary: document-utils_

- [x] 11.4 (P) 新着バッジ・Googleフォールバック関連の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`documents.list`に、新着バッジラベル（`newBadge`）・Googleプレビュー失敗メッセージ（`googlePreviewError`）・常時表示の補助案内文（`googlePreviewHint`）を追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在することで完了とする
  - _Requirements: 16.4, 17.3_
  - _Boundary: i18n messages_

- [x] 11.5 新着バッジを一覧カードに表示する
  - `DocumentList`で新着バッジラベルを解決し、`DocumentListClient`経由で`DocumentListItem`へ受け渡す
  - `DocumentListItem`で`isRecentlyUploaded(document.uploadedAt)`が`true`のとき、既存のメタ情報行（ファイルサイズ・`<time>`）に併記する形で新着バッジを表示する
  - 既存のアップロード日表示・並び順（要件3.1）を変更しないことで完了とする
  - _Requirements: 16.1, 16.5_
  - _Boundary: DocumentListItem, DocumentList_
  - _Depends: 11.3, 11.4_

- [x] 11.6 Google埋め込み失敗時のフォールバックUIを実装する（要件13.6の上書き）
  - `PdfViewer`の`variant: "google"`について、iframeの`error`イベントを検知してフォールバックブロック（メッセージ＋「元のドキュメントを開く」リンク）を表示できるようにする（`error`検知のため`PdfViewer`の`"use client"`化、またはGoogleプレビュー部分のクライアント子コンポーネント切り出しのいずれかを採用する）
  - `error`が発火しないクロスオリジンのエラーページ表示に備え、`variant: "google"`ではプレビュー成否によらず常時、iframe直下に補助案内文＋元リンク導線を表示する
  - フォールバックメッセージ・補助案内文は`DocumentList`→`DocumentListItem`経由でpropsとして受け取り、`variant: "upload"`にはフォールバックUIを適用しない
  - Googleリンク型でプレビューが表示できない場合に案内文と元リンクが表示され、アップロード型では従来どおりの描画が維持されることで完了とする
  - _Requirements: 17.1, 17.2, 17.4, 17.5_
  - _Boundary: PdfViewer, DocumentListItem, DocumentList_
  - _Depends: 11.4_

- [x] 11.7 (P) 単体テストを追加・更新する
  - `isRecentlyUploaded`が基準期間内/外・境界値に対して期待通りの真偽を返すことを検証するテストを追加する
  - `DocumentListItem`が新着ドキュメントに新着バッジを表示し、非新着では表示しないこと、説明文に改行保持スタイルが適用されることを検証するテストを追加する
  - `PdfViewer`が`variant: "google"`でiframe `error`時にフォールバックUIを表示し、`variant: "upload"`では表示しないこと、両variantのiframeに`loading="lazy"`が付与されることを検証するテストを追加する
  - 全テストがパスすることで完了とする
  - _Requirements: 14.1, 15.1, 16.1, 16.3, 17.1, 17.4_
  - _Depends: 11.1, 11.2, 11.5, 11.6_

---

## 追加ラウンド（2026-07-23）: 下書き（非公開）ドキュメントの非表示

> 前提: `documents-management`spec のタスク10（`Document`に`status`追加・`visibleToWhere`への`status: "published"`フィルタ追加）が実装済みであること（実装順序は`documents-management`を先行させる）。

- [x]* 12. 下書きドキュメントが申請者側一覧に表示されないことを確認する
  - `documents-management`spec側で`status: "draft"`のドキュメントを作成した状態で、申請者側`/documents`の一覧に当該ドキュメントが表示されないこと、`published`のドキュメントは従来どおり表示・プレビューされることを確認する
  - 本spec側の一覧UI（`DocumentList` / `DocumentListClient` / `DocumentListItem` / `PdfViewer`）に状態分岐の追加変更が不要であること（`getDocuments`側のフィルタのみで満たされること）をコードレビューで確認する
  - 下書きフィルタ適用後も検索（要件12）・2列グリッド（要件11）・新着バッジ（要件16）・Google埋め込みフォールバック（要件17）が公開済みドキュメントに従来どおり機能することを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 18.1, 18.2, 18.3, 18.4_
  - _Depends: documents-management タスク10_

## 追加ラウンド（2026-07-27）: 選択ロケールに応じたタイトル・説明の表示（要件19）

> 前提: `documents-management`spec のタスク11（`DocumentTranslation`追加・`resolveDocumentContent`・`getDocuments`への`locale`引数追加）が実装済みであること（同一エージェントが「documents一式」として先に`documents-management`タスク11 → 本タスク13の順で実装する）。

- [x] 13. 申請者側一覧を選択ロケールのタイトル・説明で表示する（要件19）
  - `src/components/features/documents/DocumentList.tsx`で、既に`getLocale()`で取得済みの`locale`を用いて`getDocuments()`を`getDocuments({ locale })`に変更する（お知らせ`AnnouncementList`と同型）
  - `DocumentListClient` / `DocumentListItem`は既存の`{document.title}`/`{document.description}`描画のまま変更しない（`getDocuments`が解決済みの内容を返す）
  - _Requirements: 19.1, 19.2, 19.4_
  - _Depends: documents-management タスク11.4, 11.8_

- [x]* 13.1 ロケール別表示の確認を行う
  - `documents-management`spec側で`en`翻訳を持つドキュメントを用意し、申請者側`/documents`を`en`ロケールで表示すると`en`のタイトル・説明、`ja`ロケールでは`ja`の内容が表示され、未登録ロケールでは`ja`にフォールバックすることを確認する
  - キーワード検索（要件12）が表示中ロケールの内容に対して機能すること、2列グリッド・新着バッジ・下書き非表示が従来どおり機能することを確認する
  - _Requirements: 19.1, 19.3, 19.4_
  - _Depends: 13_

---

## 追加ラウンド（2026-07-28）: 大分類トップページと大分類配下一覧（要件20〜22）

> **前提（着手順序）**: `documents-management`spec のタスク12（カテゴリのデータモデル・サービス・API基盤）が実装済みであること。本specは読み取り専用で、`documents-management`spec所有の型（`DocumentCategorySummary`・`DocumentCategoryDetail`・`DocumentSubCategoryOption`）と読み取り関数（`getVisibleDocumentCategories`・`getVisibleDocumentCategory`・`getDocumentsByCategory`）に依存する。同一エージェントが「documents一式」として`documents-management`タスク12 → 13 → **本タスク14**の順に実装する。
> **本ラウンドで変更しないもの**: `DocumentListItem`・`PdfViewer`（プレビュー・ダウンロード/元リンク・新着バッジ・Googleフォールバックの挙動をそのまま流用する）、`Sidebar`・ナビゲーション定義（アクティブ判定が前方一致のため`/documents/categories/...`でも「ドキュメント」項目が選択状態のまま）。
> **構成変更の要点**: `/documents`は大分類カードのみの画面になり、従来のドキュメントカード一覧（プレビュー・検索・2列グリッド）は新規ルート`/documents/categories/[categoryId]`へ移設される。中分類は3階層目のページではなく、移設先一覧内の絞り込み条件として提供する。

- [x] 14. 申請者側を大分類トップページと大分類配下一覧の2階層構成に変更する（要件20〜22）

- [x] 14.1 (P) カテゴリ関連の翻訳キーを追加する（要件20.4, 20.12, 21.13, 22.1）
  - `messages/ja.json`・`messages/en.json`の`documents`名前空間に、大分類カードの件数表示（件数を埋め込む形式）・大分類が見つからない旨のメッセージ・トップページへ戻る導線ラベル・中分類絞り込みのラベルと「すべての中分類」選択肢を追加する
  - 既存の`documents.list.title`・`documents.list.description`・`documents.list.empty`・`documents.list.error`はトップページで流用し、新規キーを作らない（`documents.list.description`は大分類配下一覧の説明文にも流用する）
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 20.4, 20.12, 21.13, 22.1_
  - _Boundary: i18n messages_

- [x] 14.2 大分類カード一覧を実装しトップページを差し替える（要件20.1〜20.12, 22.1, 22.2, 22.3）
  - 大分類カードコンポーネントを新設する: カテゴリ名（選択ロケールで解決済み）と配下の自社可視・公開済みドキュメント件数を表示し、カード全体を大分類配下一覧へのリンクにしてアクセシブルな名前を与える（要件20.4・20.6）。ダッシュボードの既存カードは`icon`/`description`が必須のため再利用せず、グリッドとカードのスタイルのみ揃える
  - 大分類一覧のサーバーコンポーネントを新設する: ロケールを解決して可視カテゴリを取得し、既存の`h1`＋説明文の見出しパターン（既存翻訳キー）を全分岐で描画したうえでカードをグリッド配置する（要件20.7）。取得中はスケルトン、取得失敗時はエラーメッセージ、表示条件を満たす大分類が0件のときは既存の0件メッセージを表示する（要件20.8・20.9）
  - 個別ドキュメントのカード・PDFプレビュー・キーワード検索欄はトップページに表示しない（要件20.1）。表示条件を満たさない大分類はカード自体を描画せず、当該大分類についての代替表示も行わない（要件20.3）
  - 表示対象・表示順・件数の判定は`documents-management`spec側の可視カテゴリ取得に委ね、本spec側に判定ロジックを持たない（要件20.2・20.5・20.10・22.2・22.3）
  - `/documents`ページを大分類一覧＋専用スケルトンの`Suspense`構成へ差し替える。タブレット幅未満で1列表示になり、いずれの幅でも横スクロールが発生しないことを確認する（要件20.11）
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12, 22.1, 22.2, 22.3_
  - _Boundary: DocumentCategoryList, DocumentCategoryCard, app/(applicant)/documents/page.tsx_
  - _Depends: 14.1, documents-management タスク12.9, 12.12_

- [x] 14.3 大分類配下のドキュメント一覧ページを実装する（要件21.1, 21.2, 21.10, 21.11, 21.12, 21.14, 21.15, 22.1, 22.4）
  - 新規ルート`/documents/categories/[categoryId]`を追加し、既存の一覧スケルトンを`Suspense`のフォールバックに用いる。コンテナ幅は従来のトップページ（2列グリッド前提の幅）と同一にする（要件21.14）
  - 既存の一覧サーバーコンポーネントの役割を「自社可視の全ドキュメント一覧」から「指定された大分類配下のドキュメント一覧」へ変更する: 大分類ID（`categoryId`）を受け取り、可視カテゴリの単体取得と大分類配下のドキュメント取得をロケール付きで行う（要件21.1・22.4）
  - 単体取得が該当なし（存在しない・自社に非公開・中分類ID）のときは「ドキュメントが見つからない」旨を表示して終了する（要件21.11）
  - `h1`に選択ロケールで解決済みのカテゴリ名を表示し（要件21.10・22.1）、その直下に既存の説明文キーを流用した説明文を置く。見出しの上にトップページへ戻る導線を配置する
  - 一覧の表示形式（プレビュー統合カード・2列グリッド・キーワード検索・遅延描画・改行保持・新着バッジ・Google埋め込みとフォールバック・下書き非表示・ロケール別のタイトル/説明）は既存実装をそのまま適用し、`DocumentListItem`・`PdfViewer`は変更しない（要件21.2・21.12）
  - 個別ドキュメントの詳細ページ・中分類専用ページは新設せず、ルートを`/documents`と`/documents/categories/[categoryId]`の2つに保つ（要件21.15）
  - _Requirements: 21.1, 21.2, 21.10, 21.11, 21.12, 21.14, 21.15, 22.1, 22.4_
  - _Boundary: DocumentList, app/(applicant)/documents/categories/[categoryId]/page.tsx_
  - _Depends: 14.1, documents-management タスク12.9, 12.12_

- [x] 14.4 中分類による絞り込みを一覧へ追加する（要件21.3〜21.9, 21.13）
  - 一覧のクライアントコンポーネントに中分類の選択状態を追加し、キーワード絞り込みの結果に対して「選択中の中分類に一致するドキュメントのみ」の条件を合成する（AND条件、要件21.7）
  - 既定は「すべての中分類」とし、その状態では中分類未設定のドキュメントも含めて当該大分類配下の全件を表示する（要件21.3・21.6）
  - 選択肢は当該大分類配下の自社に公開されている中分類のみ（`documents-management`側の単体取得が返すもの）とし、順序もその結果に従う（要件21.5）
  - 検索バーに中分類のセレクトを追加する。中分類が0件の大分類ではセレクトを描画しない。ラベル・選択肢の固定文言はクライアント側で解決し、中分類名は取得済みの解決済み名称を用いる（要件21.13）
  - 絞り込みはページ全体の再読み込みなしに即時反映し、条件クリア操作でキーワードと中分類の両方を初期状態へ戻す（要件21.8）。一致0件のときは既存の0件メッセージを表示する（要件21.9）
  - 絞り込み後もアップロード日降順の並び順と2列グリッドが維持されることを確認する（要件21.12）
  - _Requirements: 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.13_
  - _Boundary: DocumentListClient, DocumentSearchBar_
  - _Depends: 14.3_

- [x]* 14.5 (P) 単体テストを追加・更新する
  - 大分類一覧が取得結果をグリッド描画し、0件時に空状態メッセージ・取得失敗時にエラーメッセージを表示すること、いずれの分岐でも見出しと説明文が表示されることを検証する
  - 大分類カードが名称と件数を表示し、大分類配下一覧へのリンクとアクセシブルな名前を持つことを検証する
  - 大分類配下一覧が指定カテゴリ名を見出しに表示し、単体取得が該当なしのとき「見つからない」旨を表示することを検証する
  - 中分類の選択で該当ドキュメントのみに絞り込まれること、「すべての中分類」では中分類未設定も表示されること、キーワードとの組み合わせがAND条件になること、条件クリアで両方が初期化されること、中分類が0件のときセレクトが描画されないことを検証する
  - 既存の一覧テスト（`DocumentList.test.tsx`）を新しい役割（大分類ID受け取り・カテゴリ名見出し・非可視カテゴリ時の表示）へ追従させ、全テストがパスすることで完了とする
  - _Requirements: 20.4, 20.6, 20.9, 21.3, 21.6, 21.7, 21.8, 21.11_
  - _Depends: 14.2, 14.3, 14.4_

- [x]* 14.6 構成変更の統合確認を行う
  - `documents-management`spec側でカテゴリを整備した状態で、トップページに可視な大分類のみが表示され、カードから遷移した一覧に当該大分類配下のドキュメントのみ（中分類の有無を問わず）が表示されることを確認する
  - カテゴリ未設定のドキュメントがトップページの件数にも大分類配下一覧にも現れないことを確認する（運用上の注意点＝手動割当が必要であることの再確認）
  - 自社に非公開の大分類IDへ直接アクセスすると「見つからない」旨が表示されることを確認する
  - 日本語・英語両ロケールで、大分類カード名・大分類配下一覧の見出し・中分類セレクトのラベルが切り替わること、未登録ロケールでは既定言語にフォールバックすることを確認する
  - 大分類配下一覧で既存のプレビュー・ダウンロード/元リンク・新着バッジ・キーワード検索・下書き非表示が従来どおり機能すること、タブレット幅未満/以上で横スクロールが発生しないことを確認する
  - `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 20.2, 20.10, 21.2, 21.11, 22.3, 22.4_
  - _Depends: 14.4, 14.5_
