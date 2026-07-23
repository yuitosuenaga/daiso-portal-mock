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

- [ ]* 12. 下書きドキュメントが申請者側一覧に表示されないことを確認する
  - `documents-management`spec側で`status: "draft"`のドキュメントを作成した状態で、申請者側`/documents`の一覧に当該ドキュメントが表示されないこと、`published`のドキュメントは従来どおり表示・プレビューされることを確認する
  - 本spec側の一覧UI（`DocumentList` / `DocumentListClient` / `DocumentListItem` / `PdfViewer`）に状態分岐の追加変更が不要であること（`getDocuments`側のフィルタのみで満たされること）をコードレビューで確認する
  - 下書きフィルタ適用後も検索（要件12）・2列グリッド（要件11）・新着バッジ（要件16）・Google埋め込みフォールバック（要件17）が公開済みドキュメントに従来どおり機能することを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 18.1, 18.2, 18.3, 18.4_
  - _Depends: documents-management タスク10_
