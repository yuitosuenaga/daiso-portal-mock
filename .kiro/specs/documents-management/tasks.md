# 実装タスク: documents-management

## 実装計画

- [x] 1. 基盤: 型・定数・翻訳キーの追加
- [x] 1.1 `Document`/`DocumentTargeting`型を新規定義する
  - `types/document.ts`に`DocumentTargeting`（`{scope:"all"} | {scope:"countries", countries: string[]} | {scope:"companies", companyCodes: string[]}`）、`Document`（`id`, `title`, `description?`, `fileName`, `fileType`, `fileSize`, `dataUrl`, `targeting`, `uploadedAt`）、`CreateDocumentInput`（`Omit<Document, "id" | "uploadedAt">`）を定義する
  - 型チェックが通ることで完了とする
  - _Requirements: 5.1, 5.5_
  - _Boundary: Document型_

- [x] 1.2 (P) 販社マスタとドキュメント検証定数を新設する
  - `lib/constants/document-company-options.ts`に`DOCUMENT_COMPANY_CODES`・`DOCUMENT_COMPANY_OPTIONS`（code/companyName/country）を定義する
  - `lib/constants/document.ts`に`DOCUMENT_MAX_FILE_SIZE_BYTES`（20MB）・`DOCUMENT_ALLOWED_MIME_TYPES`（`application/pdf`のみ）を定義する
  - 型チェックが通ることで完了とする
  - _Requirements: 5.3, 6.1, 6.3_
  - _Boundary: DocumentsMockApi_

- [x] 1.3 (P) `MOCK_CURRENT_COMPANY`に販社コードを追加する
  - `lib/constants/current-company.ts`の`MOCK_CURRENT_COMPANY`に`companyCode: "vn-daiso-vietnam"`を追加する（既存フィールドは変更しない）
  - 既存の`announcements.ts`・`inquiries.ts`の挙動・既存テストに影響がないことで完了とする
  - _Requirements: 5.5_
  - _Boundary: CurrentCompany_

- [x] 1.4 (P) ドキュメント管理の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に一覧・作成・編集画面用の翻訳キーを新規名前空間（`helpdeskDocuments`）として追加する
  - `helpdeskNav`名前空間に「ドキュメント管理」のキーを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 9.1, 9.2_
  - _Boundary: i18n messages_

---

- [x] 2. 基盤: モックAPI・バリデーション・Server Actions
- [x] 2.1 ドキュメントの読み取り・CRUDモックAPIを実装する
  - `lib/api/documents.ts`に`getGlobalMockStore("documents", ...)`でシードデータ（4〜6件、`targeting`のバリエーションを含む）を保持する
  - 自社可視性判定（`scope:"all"`、または自社国を含む`scope:"countries"`、または自社`companyCode`を含む`scope:"companies"`）を行う`getDocuments`・`getDocumentById`（申請者側）と、絞り込みを行わない`getAllDocuments`・`getDocumentByIdForHelpdesk`（ヘルプデスク側）を実装する
  - `createDocument`・`updateDocument`・`deleteDocument`を実装する（`uploadedAt`は保存時刻を採番、存在しないIDはエラーをthrow）
  - `getDocuments()`が可視性条件を満たすもののみ、`getAllDocuments()`が全件を返すことで完了とする
  - _Requirements: 1.1, 5.5, 8.1_
  - _Boundary: DocumentsMockApi_
  - _Depends: 1.1, 1.2, 1.3_

- [x] 2.2 (P) PDFファイルの検証ユーティリティを実装する
  - `lib/document-utils.ts`に`validateDocumentFile(file)`（形式・サイズのみ検証、`{valid:true}|{valid:false;reason:"size"|"type"}`を返す）を実装する
  - `readFileAsDataUrl`・`formatFileSize`は`lib/attachment-utils.ts`から再利用し複製しない
  - PDF以外の形式・20MB超のファイルがそれぞれ正しい`reason`で拒否されることで完了とする
  - _Requirements: 6.1, 6.2, 6.3_
  - _Boundary: DocumentsMockApi_
  - _Depends: 1.2_

- [x] 2.3 (P) ドキュメントフォームのバリデーションスキーマを実装する
  - `lib/validation/document.ts`にタイトル必須、公開範囲は`discriminatedUnion`（`scope:"all"`/`scope:"countries"`で国1件以上/`scope:"companies"`で販社1件以上）、ファイルは`fileType`がPDF・`fileSize`が上限以下・`dataUrl`が`data:application/pdf`で始まることを検証する`zod`スキーマを定義する
  - タイトル未入力、公開範囲0件選択、PDF以外の形式、20MB超過のいずれかを渡すとバリデーションエラーになることで完了とする
  - _Requirements: 2.2, 3.2, 5.1, 5.2, 5.4, 6.1, 6.3_
  - _Boundary: DocumentsMockApi_
  - _Depends: 1.1, 1.2_

- [x] 2.4 ドキュメントの作成・編集・削除のServer Actionsを実装する
  - `lib/actions/documents.ts`に`"use server"`を付与し、`createDocumentAction`・`updateDocumentAction`・`deleteDocumentAction`を実装する
  - `createDocumentAction`・`updateDocumentAction`は`documentFormSchema`でサーバー側バリデーションを行い、不正な入力は保存せず例外を送出する
  - 各アクションの最後に、ヘルプデスク側一覧・編集、申請者側一覧・詳細ルートを`revalidatePath`で再検証する
  - 作成後にヘルプデスク側一覧と、可視性条件が一致する場合は申請者側一覧の両方に新しいドキュメントが反映されることで完了とする
  - _Requirements: 2.3, 3.4, 4.3, 6.4, 8.1_
  - _Boundary: DocumentActions_
  - _Depends: 2.1, 2.3_

---

- [x] 3. コア: ドキュメント管理画面
- [x] 3.1 DocumentManagementListを実装する
  - `getAllDocuments()`を呼び出し、アップロード日降順で一覧表示する
  - ローディング中はスケルトンUI、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示する
  - 一覧の各項目にタイトル・ファイルサイズ・アップロード日・公開範囲（全体公開／対象国名／対象販社名）を表示し、新規作成画面・各ドキュメントの編集画面への導線を表示する
  - 一覧に登録済みの全ドキュメントが表示されることで完了とする
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: DocumentManagementList_
  - _Depends: 2.1_

- [x] 3.2 (P) DeleteDocumentButtonを実装する
  - クリック時にブラウザ標準の`confirm()`で確認し、確認後に`deleteDocumentAction`を呼び出すボタンを実装する
  - 確認をキャンセルした場合は削除アクションを呼び出さないことで完了とする
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: DeleteDocumentButton_
  - _Depends: 2.4_

- [x] 3.3 (P) DocumentFileFieldを実装する
  - `<Input type="file" accept="application/pdf">`（単一ファイル）で選択→`validateDocumentFile`→`readFileAsDataUrl`の順に処理し、ファイル名・サイズのみのプレビューと削除操作を実装する
  - PDF以外の形式・サイズ超過を選択するとエラーメッセージが表示され、選択状態に反映されないことで完了とする
  - _Requirements: 2.5, 6.1, 6.2_
  - _Boundary: DocumentFileField_
  - _Depends: 2.2_

- [x] 3.4 (P) DocumentFormを実装する
  - タイトル・説明（任意）の入力欄に加え、公開範囲を「全体公開」「特定の国・地域を指定」「特定の販社を指定」から選択し、後者2つの場合はそれぞれ複数選択できるUIを`react-hook-form`+`zod`（`lib/validation/document.ts`）で実装し、`DocumentFileField`を組み込む
  - 新規作成時は`createDocumentAction`、編集時は`updateDocumentAction`を呼び出し、新規作成・編集の両方で共用する。編集時にファイルが再選択されない場合は既存のファイル情報を保持する
  - 必須項目が未入力、または公開範囲を国・販社指定にしたまま0件選択の状態で送信すると送信がブロックされ、正しく入力すると保存されることで完了とする
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_
  - _Boundary: DocumentForm_
  - _Depends: 2.3, 2.4, 3.3_

- [x] 3.5 ドキュメント管理一覧ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/documents/page.tsx`を新設し、`DocumentManagementList`・`DeleteDocumentButton`を結線する
  - `/[locale]/helpdesk/documents`にアクセスすると全件のドキュメント一覧と削除・編集導線が表示されることで完了とする
  - _Requirements: 1.1, 10.1_
  - _Boundary: DocumentManagementList_
  - _Depends: 3.1, 3.2_

- [x] 3.6 (P) ドキュメント新規作成ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/documents/new/page.tsx`を新設し、`DocumentForm`を新規作成モードで結線する
  - 新規作成に成功すると、ドキュメント管理一覧に新しいドキュメントが反映されることで完了とする
  - _Requirements: 2.1, 2.3, 2.4, 10.1_
  - _Boundary: DocumentForm_
  - _Depends: 3.4_

- [x] 3.7 (P) ドキュメント編集ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/documents/[id]/edit/page.tsx`を新設し、`getDocumentByIdForHelpdesk`で取得した既存内容を初期値として`DocumentForm`を編集モードで結線し、`DeleteDocumentButton`も配置する
  - 存在しないIDの場合は見つからない旨のメッセージと一覧へ戻るリンクを表示する
  - 既存のドキュメントを編集して保存すると、変更内容がドキュメント管理一覧・申請者側の表示に反映されることで完了とする
  - _Requirements: 3.1, 3.4, 3.5, 4.1, 10.1_
  - _Boundary: DocumentForm, DeleteDocumentButton_
  - _Depends: 3.4, 3.2_

---

- [x] 4. 統合: ナビゲーションへの統合
- [x] 4.1 HelpdeskSidebarへナビゲーション項目を追加する
  - `HELPDESK_NAV_ITEMS`に「ドキュメント管理」（`/helpdesk/documents`）の項目を追加する
  - 既存項目と同様に、現在表示中のページに対応する項目がアクティブ状態で強調表示されることで完了とする
  - _Requirements: 7.1, 7.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 3.5_

---

- [x] 5. 検証: 単体テスト・統合確認・多言語/レスポンシブ確認
- [x] 5.1 (P) 可視性フィルタとCRUDミューテーションの単体テストを実装する
  - `getDocuments`/`getDocumentById`が`scope:"all"`・自社国・自社販社のいずれかを満たすドキュメントのみを返すこと、`getAllDocuments`が全件を返すことを検証するテストを実装する
  - `createDocument`/`updateDocument`/`deleteDocument`が対象のドキュメントのみを操作し、存在しないIDへの操作がエラーになることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 1.1, 5.5, 8.1_
  - _Depends: 2.1_

- [x] 5.2 (P) バリデーションとファイル検証の単体テストを実装する
  - `documentFormSchema`がタイトル未入力・公開範囲0件選択・PDF以外の形式・サイズ超過を拒否することを検証するテストを実装する
  - `validateDocumentFile`が形式・サイズを正しく判定することを検証するテストを実装する
  - Server Actionsに不正な入力を渡すと例外になり、ストアが変更されないことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 2.2, 3.2, 5.4, 6.1, 6.2, 6.3, 6.4_
  - _Depends: 2.2, 2.3, 2.4_

- [x] 5.3 (P) 作成・編集・削除が申請者側に反映されることを確認する
  - ヘルプデスク側で「全体公開」のドキュメントを作成した後、申請者側の一覧・詳細に表示されることを確認する
  - 自社の国・販社を含む公開範囲で作成した場合も同様に表示され、含まない場合は表示されない（IDへの直接アクセスも「見つからない」になる）ことを確認する
  - 編集時にファイルを再選択しなかった場合に既存ファイルが保持されること、削除後にヘルプデスク側・申請者側の両方から除去されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 8.1_
  - _Depends: 3.6, 3.7_

- [x] 5.4 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで一覧・作成・編集画面の文言が正しく切り替わることを確認する
  - タブレット幅（768px）で新規画面が横スクロールを起こさないことを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 9.1, 9.2, 10.1_
  - _Depends: 3.5, 3.6, 3.7_

---

- [x] 6. 既存ドキュメント画面のプレビュー表示とビュー/編集切り替え（2026-07-09 追記）
- [x] 6.1 targetingLabelをdocument-utils.tsへ切り出す
  - `DocumentManagementList.tsx`内のローカル関数`targetingLabel`を`src/lib/document-utils.ts`に移動し、`DocumentManagementList.tsx`側はインポートに置き換える（重複定義を避ける）
  - `DocumentManagementList`の既存表示が変わらないことで完了とする
  - _Requirements: 11.1_
  - _Boundary: DocumentsMockApi_

- [x] 6.2 (P) 翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`helpdeskDocuments.form`に`detailTitle`（「ドキュメント詳細」/"Document Details"）・`editButton`（「編集」/"Edit"）・`cancelButton`（「キャンセル」/"Cancel"）を追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在することで完了とする
  - _Requirements: 11.2, 11.3, 11.5_
  - _Boundary: i18n messages_

- [x] 6.3 DocumentDetailPanelを実装する
  - `mode: "view" | "edit"`（初期値`"view"`）をローカル状態で持つクライアントコンポーネントを新設する
  - `view`時: タイトル・説明・`targetingLabel`による公開範囲要約・ファイルサイズ・アップロード日を読み取り専用で表示し、その直下に`PdfViewer`（`documents`spec所有）を配置。「編集」ボタン・`DeleteDocumentButton`・一覧へ戻るリンクを表示する
  - `edit`時: 既存の`DocumentForm`（`mode="edit"`, 変更なし）と`PdfViewer`を並べて表示し、「キャンセル」ボタンで`mode`を`"view"`に戻す（保存は行わない、ページ遷移なし）
  - PDFプレビュー領域に`title`属性でドキュメントのタイトルを設定することで完了とする
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7_
  - _Boundary: DocumentDetailPanel_
  - _Depends: 6.1, 6.2_

- [x] 6.4 ドキュメント編集ルートをDocumentDetailPanelに結線する
  - `app/[locale]/helpdesk/documents/[id]/edit/page.tsx`のデータ取得・翻訳解決はそのまま維持し、`DocumentForm`を直接呼ぶ代わりに`DocumentDetailPanel`へ表示用props・フォーム用props一式を渡す
  - 存在しないIDの場合は見つからない旨のメッセージと一覧へ戻るリンクを表示する（変更なし）
  - 一覧の「編集」リンクから遷移すると、まず表示モード（登録済み情報＋PDFプレビュー）が表示され、「編集」ボタンで編集モードに切り替わることで完了とする
  - _Requirements: 11.1, 11.6, 11.8_
  - _Boundary: DocumentDetailPanel_
  - _Depends: 6.3_

- [x] 6.5 (P) DocumentDetailPanelの単体テストを実装する
  - 初期表示（表示モード）でタイトル・説明・公開範囲要約・ファイルサイズ・アップロード日・PDFプレビューが表示され、編集フォームが表示されないことを検証するテストを実装する
  - 「編集」ボタンクリックで編集モードに切り替わり、`DocumentForm`とPDFプレビューが両方表示されることを検証するテストを実装する
  - 編集モードで「キャンセル」をクリックすると表示モードに戻ることを検証するテストを実装する
  - `targetingLabel`が全体公開／国単位／販社単位の各パターンで正しいラベルを返すことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Depends: 6.4_

- [x] 6.6 DocumentDetailPanelの初期モードを編集モードに変更する（要件12）
  - `mode: "view" | "edit"`の初期値を`"view"`から`"edit"`に変更する
  - 一覧の「編集」リンクから遷移した直後に、既存の`DocumentForm`（`mode="edit"`）と`PdfViewer`が表示され、追加のクリック操作なしでタイトル等を編集できることを確認する
  - 編集モードで「キャンセル」を押すと表示モード（読み取り専用情報＋PDFプレビュー、「編集」ボタン）に戻ることは変更しない
  - 6.5で実装した単体テストのうち、初期表示が表示モードであることを前提としたテストを、初期表示が編集モードであることを検証するテストに更新する（表示モードへの遷移はキャンセル時のみであることを検証するテストを追加する）
  - 全テストがパスすることで完了とする
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - _Boundary: DocumentDetailPanel_
  - _Depends: 6.5_

---

- [x] 7. Googleドキュメント/スプレッドシートの共有リンクによる登録（2026-07-16 追記）
- [x] 7.1 Document型・CreateDocumentInputをsourceTypeによる判別可能ユニオン型に変更する
  - `Document`型を共通フィールド（`id`, `title`, `description?`, `targeting`, `uploadedAt`）+ `sourceType: "upload"`ブランチ（`fileName`, `fileType`, `fileSize`, `dataUrl`）+ `sourceType: "google"`ブランチ（`googleUrl`, `googleEmbedUrl`）の判別可能ユニオン型に変更する
  - `CreateDocumentInput`も同様に`Document`から`id`・`uploadedAt`を除いた判別可能ユニオン型に変更する
  - 既存のモックシードデータ（`lib/api/documents.ts`）の全件に`sourceType: "upload"`を明示的に付与し、型チェックが通ることで完了とする
  - _Requirements: 13.5, 13.6_
  - _Boundary: Document型_

- [x] 7.2 (P) GoogleドキュメントURL変換ユーティリティを実装する
  - `docs.google.com/document/`・`docs.google.com/spreadsheets/`・`docs.google.com/presentation/`のいずれかのURLから種別とファイルIDを抽出し、それ以外は変換不能を返す関数を実装する
  - 抽出結果から`{種別}/d/{ファイルID}/preview`形式の埋め込み用URLを生成し、無効なURLには`null`を返す変換関数を実装する
  - Docs/Sheets/Slidesそれぞれの有効なURL・無効なURL（他ドメイン、不正形式）を渡した際に期待通りの結果を返すことで完了とする
  - _Requirements: 13.3, 13.5_
  - _Boundary: GoogleDocumentUrlUtils_

- [x] 7.3 documentFormSchemaをsourceTypeによる判別可能ユニオンに変更する
  - `sourceType: "upload"`ブランチは既存の`fileName`/`fileType`/`fileSize`/`dataUrl`検証を維持し、`sourceType: "google"`ブランチはタイトル・公開範囲・`googleUrl`を検証し、`googleUrl`は埋め込みURLへの変換結果が得られることを条件とする
  - タイトル・公開範囲未入力、`googleUrl`が不正な形式の場合にそれぞれ正しくバリデーションエラーになることで完了とする
  - _Requirements: 13.3, 13.4, 13.6, 13.7_
  - _Boundary: DocumentActions_
  - _Depends: 7.1, 7.2_

- [x] 7.4 (P) Googleリンク登録関連の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`helpdeskDocuments.form`に登録方法選択（アップロード/Googleリンク）・Google URL入力欄（ラベル・プレースホルダー・共有設定に関するヘルプテキスト・エラーメッセージ）のキーを追加する
  - `helpdeskDocuments.list`に登録方式バッジ（アップロード/Googleリンク）のキーを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在することで完了とする
  - _Requirements: 13.1, 13.2, 13.9_
  - _Boundary: i18n messages_

- [x] 7.5 (P) DocumentGoogleLinkFieldを実装する
  - `<Input type="url">`でGoogle共有リンクを入力し、変更時・送信時に埋め込みURLへの変換結果で検証してエラーメッセージを表示するコンポーネントを実装する
  - Google側のファイル共有設定（リンクを知っている全員が閲覧可）が必要である旨のヘルプテキストを表示する
  - 無効なURLを入力するとエラーメッセージが表示され、有効なURLでエラーが解消されることで完了とする
  - _Requirements: 13.2, 13.3_
  - _Boundary: DocumentGoogleLinkField_
  - _Depends: 7.2, 7.4_

- [x] 7.6 DocumentFormに登録方法の選択とGoogleリンク入力を統合する
  - タイトル・説明・公開範囲の入力欄はそのまま維持し、登録方法（ファイルをアップロード/Googleドキュメントの共有リンクを登録）を選択するUIを追加し、選択に応じて`DocumentFileField`または`DocumentGoogleLinkField`を出し分ける
  - 既存ドキュメントの編集時は登録済みの`sourceType`を初期選択として表示する
  - タイトル・公開範囲・（選択した登録方法に応じた）ファイルまたはURLのいずれかが未入力の状態で送信すると送信がブロックされ、正しく入力すると保存されることで完了とする
  - _Requirements: 13.1, 13.2, 13.4, 13.8_
  - _Boundary: DocumentForm_
  - _Depends: 7.3, 7.5_

- [x] 7.7 DocumentActionsをsourceType分岐に対応させる
  - `createDocumentAction`・`updateDocumentAction`を`documentFormSchema`（`sourceType`判別可能ユニオン）で再検証し、`sourceType: "google"`の場合はクライアントから送られた埋め込みURLをそのまま使わず、`googleUrl`からサーバー側で埋め込みURLを再計算して保存するようにする
  - `sourceType: "upload"`の既存の保存処理・`revalidatePath`対象は変更しない
  - Googleリンクで新規作成した際、保存されたドキュメントの埋め込みURLがサーバー側の計算結果と一致し、クライアントから異なる値を送っても上書きされないことで完了とする
  - _Requirements: 13.5, 13.6, 13.7_
  - _Boundary: DocumentActions_
  - _Depends: 7.3, 7.6_

- [x] 7.8 (P) DocumentManagementListに登録方式バッジを追加する
  - 一覧の各行に、`sourceType`に応じた「アップロード」/「Googleリンク」バッジを表示する
  - アップロード方式・Googleリンク方式のドキュメントが混在する一覧で、それぞれ正しいバッジが表示されることで完了とする
  - _Requirements: 13.9_
  - _Boundary: DocumentManagementList_
  - _Depends: 7.1_

- [x] 7.9 DocumentDetailPanelをsourceType分岐に対応させる
  - 表示モードの読み取り専用情報を、`sourceType: "upload"`時は既存通り（ファイルサイズ・アップロード日）、`sourceType: "google"`時は登録方式・元の共有リンクURLを表示するよう分岐させる
  - `PdfViewer`（`documents`spec所有）へ渡すpropsを、`sourceType: "upload"`時は既存のデータURL系、`sourceType: "google"`時は埋め込みURL・元URL系に切り替える（`documents`spec側で`PdfViewer`がバリアント分岐に対応済みであることが前提）
  - 編集モードでは7.6で対応済みの`DocumentForm`をそのまま使用し、変更はしない
  - Googleリンク方式のドキュメントの編集画面を開くと、表示モードで元のリンクURLとプレビューが表示されることで完了とする
  - _Requirements: 13.8, 13.10_
  - _Boundary: DocumentDetailPanel_
  - _Depends: 7.6, 7.8_

- [x] 7.10 (P) GoogleドキュメントURL変換・バリデーションの単体テストを実装する
  - URL変換ユーティリティがDocs/Sheets/Slidesの有効なURL・無効なURLに対して期待通りの結果を返すことを検証するテストを実装する
  - `documentFormSchema`が`sourceType: "google"`ブランチで無効なURLを拒否し有効なURLを受理すること、`sourceType: "google"`時に`fileName`等を要求しないことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 13.3, 13.6, 13.7_
  - _Depends: 7.2, 7.3_

- [x] 7.11 (P) Googleリンク登録の統合確認を行う
  - Googleリンクで作成したドキュメントが、公開範囲条件に応じてヘルプデスク一覧・申請者側一覧の両方にアップロード方式と同様に反映されることを確認する
  - 既存のGoogleリンク型ドキュメントを編集してURLのみ変更した場合に埋め込みURLが再計算されることを確認する
  - 本specがGoogle Drive APIによる変更検知・自動再同期・OAuth連携を一切実装していないこと（埋め込み表示のみに依拠していること）をコードレビューで確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 13.10, 13.11_
  - _Depends: 7.7, 7.9_

---

## 追加ラウンド（2026-07-22）: ドキュメント管理一覧の検索・絞り込み・ページネーション

- [x] 8. ドキュメント管理一覧に検索・絞り込み・ページネーションを追加する

- [x] 8.1 ページサイズ・絞り込み選択肢の定数を定義する
  - 1ページあたりの件数（例: `DOCUMENT_MANAGEMENT_PAGE_SIZE = 10`）と、登録方式（`all`/`upload`/`google`）・公開範囲種別（`all`/`all-scope`/`countries`/`companies`）の絞り込み選択肢を、`helpdesk-documents`配下または`src/lib/constants/document.ts`等に定数として定義する
  - 定数が1箇所で管理され、表示コンポーネントにマジックナンバー・選択肢の直書きが無いことで完了とする
  - _Requirements: 14.3, 14.4, 14.9_
  - _Boundary: constants_

- [x] 8.2 (P) 検索・絞り込み・ページネーションの翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`helpdeskDocuments`（`list`または新設`filter`名前空間）に、検索欄プレースホルダー・登録方式/公開範囲種別の絞り込みラベルと各選択肢ラベル・クリアボタン・絞り込み後0件メッセージ・ページネーション操作ラベル（前へ／次へ・現在/総ページ表示等）を追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在することで完了とする
  - _Requirements: 14.13_
  - _Boundary: i18n messages_

- [x] 8.3 管理一覧用の検索・絞り込みバーを実装する
  - `DocumentManagementFilterBar`（新規）を実装する。キーワード入力欄・登録方式セレクト・公開範囲種別セレクト・条件クリアボタンを持ち、状態は保持せず変更を都度呼び出し元へ通知する（`DocumentSearchBar`/`AnnouncementFilterBar`のパターンに倣う）
  - タブレット幅（768px以上）で横スクロールを起こさないレイアウトであることで完了とする
  - _Requirements: 14.1, 14.3, 14.4, 14.7, 14.14_
  - _Boundary: DocumentManagementFilterBar_
  - _Depends: 8.1, 8.2_

- [x] 8.4 ページネーションUIを実装する
  - ページネーションコンポーネント（新規、例: `DocumentManagementPagination`）を実装する。前へ／次へ操作と現在ページ/総ページ表示を持ち、ラベルは翻訳キーから受け取る
  - タブレット幅（768px以上）で横スクロールを起こさないことで完了とする
  - _Requirements: 14.9, 14.10, 14.13, 14.14_
  - _Boundary: DocumentManagementPagination_
  - _Depends: 8.1, 8.2_

- [x] 8.5 DocumentManagementListClientを実装し行描画を移設する
  - `DocumentManagementListClient`（新規・クライアントコンポーネント）を実装する。props（全件`documents`・`locale`・ラベル辞書・翻訳文字列）を受け取り、`keyword`・`sourceTypeFilter`・`scopeFilter`・`page`の状態を保持する
  - 絞り込みは`filterDocuments`（`documents`spec の`src/lib/document-utils.ts`を再利用）＋`sourceType`一致＋`targeting.scope`一致の述語合成で行い、アップロード日降順の並び順を維持する（`useMemo`で算出）
  - 絞り込み後配列を`DOCUMENT_MANAGEMENT_PAGE_SIZE`件ごとに分割し現在ページ分のみを`ManagementListRow`で描画する。行の中身（タイトル・登録方式バッジ・ファイルサイズ・アップロード日・公開範囲・編集/削除リンク）は既存`DocumentManagementList`の描画を移設する
  - `keyword`/`sourceTypeFilter`/`scopeFilter`変更時に`page`を1へリセットし、絞り込み結果0件時に0件メッセージを表示する
  - `DocumentManagementFilterBar`・`DocumentManagementPagination`を結線することで完了とする
  - _Requirements: 14.2, 14.5, 14.6, 14.8, 14.9, 14.10, 14.11, 14.12_
  - _Boundary: DocumentManagementListClient_
  - _Depends: 8.3, 8.4_

- [x] 8.6 DocumentManagementList（サーバー側）を委譲構成に変更する
  - `DocumentManagementList`は`getAllDocuments()`による全件取得・エラー/全体0件ハンドリング・見出し・ラベル辞書生成をサーバー側に残し、行描画とインタラクティブUIを`DocumentManagementListClient`へprops渡しで委譲する
  - 既存の取得構造・`revalidatePath`対象・`getAllDocuments`のインターフェースを変更しないことで完了とする
  - _Requirements: 14.12_
  - _Boundary: DocumentManagementList_
  - _Depends: 8.5_

- [x] 8.7 (P) 単体テストを追加・更新する
  - `DocumentManagementListClient`が、キーワード・登録方式・公開範囲種別の各絞り込みおよびそれらの組み合わせで期待通りに件数を絞り込むこと、条件変更でページが先頭に戻ること、絞り込み後0件でメッセージを表示すること、ページ切り替えで該当ページのみ表示することを検証するテストを追加する
  - 絞り込み・ページ切り替え後もアップロード日降順の並び順が維持されること、既存の登録方式バッジ・編集/削除導線が表示されることを検証するテストを追加する
  - 既存の`DocumentManagementList.test.tsx`を委譲構成に合わせて更新し、全テストがパスすることで完了とする
  - _Requirements: 14.2, 14.5, 14.8, 14.10, 14.11, 14.12_
  - _Depends: 8.5, 8.6_

- [x] 9. ドキュメント削除確認をアプリ内モーダル（ConfirmDialog）へ置き換え、対象タイトルを明示する（2026-07-22 追記 / 要件15）
  - `DeleteDocumentButton.tsx`の`window.confirm()`を廃止し、共通`ConfirmDialog`（helpdesk-portal-layout要件18）でラップ。確認押下時のみ既存削除処理を実行、`isPending`を伝播する
  - `title` prop と確認モーダル用文言propsを追加し、呼び出し側から対象タイトルを渡す
  - `helpdeskDocuments.list.deleteConfirm`を`{title}`プレースホルダー付きに変更し、確認見出し・確認/キャンセルボタン文言を`messages/ja.json`・`messages/en.json`へ追加する
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  - _Depends: helpdesk-portal-layout タスク9（ConfirmDialog新設）_

- [x]* 9.1 `DeleteDocumentButton.test.tsx` をConfirmDialogベースへ更新する
  - トリガー押下→確認押下で削除実行、キャンセルで未実行、本文に対象タイトル表示を検証する
  - _Requirements: 15.6_
  - _Depends: 9_

---

## 追加ラウンド（2026-07-23）: ドキュメントの下書き（非公開）状態

- [x] 10. ドキュメントに下書き/公開状態（`status`）を追加する

- [x] 10.1 Prismaスキーマに`DocumentStatus` enumと`Document.status`列を追加しマイグレーションを生成する
  - `prisma/schema.prisma`に`enum DocumentStatus { draft published }`を追加し、`Document`モデルに`status DocumentStatus @default(published)`を追加する
  - `prisma migrate dev`で新規マイグレーション（例: `add_document_draft_status`）を生成する。生成SQLがenum作成＋`ADD COLUMN "status" ... NOT NULL DEFAULT 'published'`となり、既存レコードが全て`published`になることを確認する
  - `prisma generate`後に型チェックが通ることで完了とする（`@default(published)`により既存seed・既存データが従来どおり公開扱いとなる後方互換を担保）
  - _Requirements: 16.1, 16.13_
  - _Boundary: schema.prisma_

- [x] 10.2 `Document`型・`CreateDocumentInput`に`status`を追加する
  - `src/types/document.ts`の`DocumentBase`に`status: "draft" | "published"`を追加する（`sourceType`両ブランチ共通のため`DocumentBase`に置く）
  - `CreateDocumentInput`は`Document`から`id`・`uploadedAt`を除いたサブセットのため`status`が自動的に含まれることを型チェックで確認する
  - 型チェックが通ることで完了とする
  - _Requirements: 16.1_
  - _Boundary: Document型_
  - _Depends: 10.1_

- [x] 10.3 マッパーで`status`を読み書きする
  - `src/lib/server/document-mapper.ts`の`mapDocument`の`base`に`status: record.status`を追加する
  - `src/lib/server/document-service.ts`内の`toDocumentData`の両分岐（upload/google）の返却オブジェクトに`status: input.status`を追加する
  - `mapDocument`が`record.status`を`Document.status`に反映し、`toDocumentData`が書き込みデータに`status`を含めることで完了とする
  - _Requirements: 16.1, 16.5_
  - _Boundary: DocumentsMockApi_
  - _Depends: 10.2_

- [x] 10.4 申請者側読み取りに`status: "published"`フィルタを追加する
  - `src/lib/server/document-service.ts`の`visibleToWhere`に`status: "published"`を追加する（`announcement-service.ts`の`visibleToCountryWhere`と同型）
  - `listAllDocuments`・`findDocumentById`（ヘルプデスク側）は`status`条件を追加せず、下書き・公開の両方を返すことを確認する
  - `getDocuments`/`getDocumentById`が`draft`を返さず、`getAllDocuments`/`getDocumentByIdForHelpdesk`が全状態を返すことで完了とする
  - _Requirements: 16.8, 16.9, 16.10_
  - _Boundary: DocumentsMockApi_
  - _Depends: 10.3_

- [x] 10.5 `documentFormSchema`に`status`検証を追加する
  - `src/lib/validation/document.ts`の`documentUploadSchema`・`documentGoogleSchema`の両ブランチに`status: z.enum(["draft", "published"])`を追加する（`validation/announcement.ts`と同型）
  - `status`未指定/不正値が拒否され、`"draft"`/`"published"`が受理されることで完了とする（Server Actionsの`documentFormSchema.parse`経由でサーバー側検証も担保される。Server Actions自体のロジック変更は不要）
  - _Requirements: 16.12_
  - _Boundary: DocumentActions_
  - _Depends: 10.2_

- [x] 10.6 (P) 状態選択・状態バッジの翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`helpdeskDocuments.form`に`statusLabel`・`statusDraftOption`（「下書き」/"Draft"）・`statusPublishedOption`（「公開」/"Published"）を追加する
  - `helpdeskDocuments.list`に`statusDraftBadge`（「下書き」/"Draft"）・`statusPublishedBadge`（「公開」/"Published"）を追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 16.11_
  - _Boundary: i18n messages_

- [x] 10.7 DocumentFormに状態選択Selectを追加する
  - `AnnouncementForm`の状態選択と同じ`Select`ベースのUIで、下書き/公開を選ぶフィールドを`DocumentForm`に追加する
  - `DocumentFormFieldValues`・`toFieldValues`・送信値整形に`status`を含める。新規作成時の`defaultValues`は`status: "draft"`、編集時は既存レコードの`status`を初期値とする
  - `statusLabel`・`statusDraftOption`・`statusPublishedOption`をpropsで受け取り、`app/[locale]/helpdesk/documents/new/page.tsx`・`[id]/edit/page.tsx`から翻訳文字列を渡す
  - 状態選択が`sourceType`・`targeting`と独立して常時表示され、新規作成時は「下書き」が初期選択、編集時は登録済み状態が初期選択となり、保存すると選択した`status`が保存されることで完了とする
  - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.6_
  - _Boundary: DocumentForm_
  - _Depends: 10.5, 10.6_

- [x] 10.8 (P) 管理一覧に状態バッジを表示する
  - `DocumentManagementListClient`の各行に、`status`に応じた状態バッジ（「下書き」/「公開」）を既存の登録方式バッジ（要件13.9）に併記する形で追加する
  - 必要な翻訳文字列（`statusDraftBadge`/`statusPublishedBadge`）をサーバー側`DocumentManagementList`から`DocumentManagementListClient`へprops渡しする
  - 下書き・公開が混在する一覧で各行に正しい状態バッジが表示されることで完了とする（状態による絞り込みUIは本ラウンドのスコープ外）
  - _Requirements: 16.7_
  - _Boundary: DocumentManagementListClient, DocumentManagementList_
  - _Depends: 10.6, 10.3_

- [x] 10.9 (P) DocumentDetailPanelの表示モードに状態を表示する
  - `DocumentDetailPanel`の表示モードの読み取り専用情報に、現在の`status`（下書き/公開）を表示する
  - 編集モードは10.7で対応済みの`DocumentForm`をそのまま使うため追加変更しない
  - 編集画面（表示モード）で現在の状態が確認できることで完了とする
  - _Requirements: 16.4_
  - _Boundary: DocumentDetailPanel_
  - _Depends: 10.7, 10.6_

- [x]* 10.10 (P) 状態フィルタ・マッパー・バリデーションの単体テストを追加・更新する
  - `mapDocument`が`status`を反映し`toDocumentData`が両分岐で`status`を含めることを検証するテストを追加する
  - `listDocumentsVisibleTo`/`findDocumentVisibleTo`が`draft`を返さず、`listAllDocuments`/`findDocumentById`が全状態を返すことを検証するテストを追加する
  - `documentFormSchema`が`status`未指定/不正値を拒否し`"draft"`/`"published"`を受理すること（upload/google両ブランチ）を検証するテストを追加する
  - 既存の`document-service.test.ts`・`document-mapper.test.ts`・`validation/document.test.ts`・`DocumentForm.test.tsx`・`DocumentManagementListClient.test.tsx`を`status`追加に追従させ、全テストがパスすることで完了とする
  - _Requirements: 16.8, 16.10, 16.12_
  - _Depends: 10.4, 10.5, 10.7, 10.8_

- [x]* 10.11 (P) 下書き非公開の統合確認を行う
  - ヘルプデスク側で`status: "draft"`のドキュメントを作成した後、申請者側の一覧・詳細に表示されないこと、`published`に変更・保存すると表示されるようになることを確認する
  - 日本語・英語両ロケールで、新規作成フォームの状態選択が初期値「下書き」で表示され、管理一覧に状態バッジが表示されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 16.8, 16.9, 16.14_
  - _Depends: 10.7, 10.8

## 追加ラウンド（2026-07-27）: ドキュメントのタイトル・説明の多言語対応（要件17）

> 本ラウンドは「documents一式」（`documents-management`＋`documents`）の実装を担当する1エージェントが、先に本specのタスク11を全て実装し、続けて`documents`spec側のタスク13（申請者側のロケール表示・確認）を行う想定。「faq一式」とはコード上の依存がなく、別エージェントで並行実装できる。
> 参考実装（そのまま横展開する）: `AnnouncementTranslation`（schema.prisma）、`announcement-mapper.ts`の`resolveAnnouncementContent`/`ANNOUNCEMENT_INCLUDE`、`announcement-service.ts`の`translationsToNestedWrite`、`validation/announcement.ts`の`titleEn`/`bodyEn`＋`translations`＋transform、`AnnouncementForm.tsx`の言語タブUI。

- [x] 11. ドキュメントのタイトル・説明を多言語（言語タブ）対応にする（要件17）

- [x] 11.1 Prismaに`DocumentTranslation`モデルを追加しマイグレーションを生成する（要件17.1, 17.2, 17.11）
  - `prisma/schema.prisma`に`AnnouncementTranslation`と同型の`model DocumentTranslation`（`documentId`・`locale`・`title`・`description String?`・`@@unique([documentId, locale])`・`@@index([documentId])`・`onDelete: Cascade`）を追加し、`Document`に`translations DocumentTranslation[]`を追加する
  - `prisma migrate dev`で`add_document_translations`マイグレーションを生成する（テーブル作成のみ。既存`Document`行のデータ移行は行わない＝後方互換）
  - _Requirements: 17.1, 17.2, 17.11_

- [x] 11.2 `Document`型に`translations`を追加する（要件17.1）
  - `src/types/document.ts`に`DocumentTranslationView { locale; title; description? }`を追加し、`DocumentBase`に`translations: DocumentTranslationView[]`を追加する（`CreateDocumentInput`にも自動で含まれる）
  - _Requirements: 17.1_
  - _Depends: 11.1_

- [x] 11.3 マッパーに`DOCUMENT_INCLUDE`・`resolveDocumentContent`を追加する（要件17.8, 17.11）
  - `src/lib/server/document-mapper.ts`に`DOCUMENT_INCLUDE = { translations: true }`・`DEFAULT_DOCUMENT_LOCALE = "ja"`・`resolveDocumentContent(document, locale)`（フォールバック順`locale`→`en`→`ja`）を追加する
  - `mapDocument`の入力型を`Prisma.DocumentGetPayload<{ include: typeof DOCUMENT_INCLUDE }>`に変更し、`base`に`translations`のマッピングを追加する
  - _Requirements: 17.8, 17.11_
  - _Depends: 11.2_

- [x] 11.4 サービス層の読み書きを翻訳対応にする（要件17.6, 17.8, 17.9）
  - `src/lib/server/document-service.ts`に`translationsToNestedWrite`（`announcement-service.ts`と同型：create=`{create}`、update=`{deleteMany:{}, create}`）を追加し、`createDocumentRecord`/`updateDocumentRecord`をネスト書き込み＋`include: DOCUMENT_INCLUDE`に変更する（`toDocumentData`は`ja`を親列に書く既存挙動を維持）
  - 全読み取り関数に`include: DOCUMENT_INCLUDE`を付ける
  - `listDocumentsVisibleTo`/`findDocumentVisibleTo`に`locale = DEFAULT_DOCUMENT_LOCALE`引数を追加し、`resolveDocumentContent`で`title`/`description`を上書きして返す。`listAllDocuments`/`findDocumentById`は未解決（ja）＋`translations`をそのまま返す
  - _Requirements: 17.6, 17.8, 17.9_
  - _Depends: 11.3_

- [x] 11.5 `documentFormSchema`を多言語入力に対応させる（要件17.4, 17.5, 17.10, 17.13）
  - `src/lib/validation/document.ts`に`documentTranslationSchema`（`locale` min2/max10・`title` min1・`description` optional）を追加し、両ブランチ（またはブランチ共通base）へ`titleEn`（optional・実質必須）・`descriptionEn`（optional）・`translations`（default []）を追加する
  - `.superRefine`に`en`タイトル必須・追加言語件数上限（20）・`ja`/`en`/追加言語間の言語コード重複禁止を追加し、`.transform`で`titleEn`/`descriptionEn`を`translations`の`en`行へ合成する（`announcementFormSchema`と同型）
  - 型を`DocumentFormValues = z.input<...>`・`DocumentSubmitValues = z.output<...>`に分ける
  - _Requirements: 17.4, 17.5, 17.10, 17.13_
  - _Depends: 11.2_

- [x] 11.6 (P) 言語タブUIの翻訳キーを追加する（要件17.12）
  - `messages/ja.json`・`messages/en.json`の`helpdeskDocuments.form`に`language`サブ名前空間（`jaTab`・`enTab`・`addButton`・`removeButton`・`localeCodeLabel`・`localeCodePlaceholder`・`localeDuplicateError`）を`helpdeskAnnouncements.form.language`と同一構成で追加する（ja/en両方、キー構造一致）
  - _Requirements: 17.12_

- [x] 11.7 DocumentFormに言語タブUIを実装する（要件17.3, 17.4, 17.5, 17.7）
  - `AnnouncementForm.tsx`の言語タブ実装（`activeLanguageTab`・`useFieldArray({name:"translations"})`・固定ja/enタブ＋追加言語タブ・言語追加ボタン・新規/エラータブ自動切替の`useEffect`）を`DocumentForm.tsx`へ移植し、各タブで`title`/`description`（ja）・`titleEn`/`descriptionEn`（en）・`translations.${i}.{locale,title,description}`を`register`する
  - `useForm`を`<DocumentFormValues, unknown, DocumentSubmitValues>`の入力/出力2型構成に変更する
  - 言語タブprops（`languageJaTabLabel`・`languageEnTabLabel`・`languageAddButtonLabel`・`languageRemoveButtonLabel`・`languageLocaleCodeLabel`・`languageLocaleCodePlaceholder`・`languageLocaleDuplicateErrorMessage`）を`AnnouncementForm`と同名で追加する
  - `DocumentDetailPanel.toFormDefaultValues(document)`を、`document.translations`から`titleEn`/`descriptionEn`（en行）と`translations`（追加言語）を復元するよう変更する
  - `new`/`[id]/edit`ページから`DocumentForm`へ言語タブ用の翻訳文字列を渡す
  - _Requirements: 17.3, 17.4, 17.5, 17.7_
  - _Depends: 11.5, 11.6_

- [x] 11.8 (P) 申請者側読み取りに`locale`を通す（要件17.8）
  - `src/lib/api/documents.ts`の`getDocuments`/`getDocumentById`に`options?: { locale?: string }`を追加し、申請者側サービス（`listDocumentsVisibleTo`/`findDocumentVisibleTo`）へ`locale`を転送する（`api/announcements.ts`と同型）
  - _Requirements: 17.8_
  - _Depends: 11.4_

- [x] 11.9 (P) seedに`en`翻訳を追加する（要件17.11）
  - `prisma/seed.ts`・`prisma/seed.sql`の既存ドキュメント5件に`DocumentTranslation`の`en`行（英語のtitle/description）を投入する（`ja`は親列のまま。デモ用）
  - _Requirements: 17.11_
  - _Depends: 11.1_

- [x]* 11.10 (P) 多言語対応の単体テストを追加・更新する
  - `resolveDocumentContent`のフォールバック（`locale`→`en`→`ja`）、`mapDocument`の`translations`マッピングを検証する（`document-mapper.test.ts`）
  - `document-service`のcreate/updateが`ja`=親列・`en`/追加=翻訳行に書くこと（updateは全置換）、`listDocumentsVisibleTo`/`findDocumentVisibleTo`が`locale`に応じた内容を返すこと、`listAllDocuments`/`findDocumentById`が未解決＋`translations`を返すことを検証する
  - `documentFormSchema`が`ja`/`en`タイトル未入力・言語コード重複・件数上限を拒否し、transformが`en`を`translations`へ合成すること（upload/google両ブランチ）を検証する
  - 既存の`DocumentForm.test.tsx`・`document-service.test.ts`・`document-mapper.test.ts`・`validation/document.test.ts`を追従させ、全テストがパスすることで完了とする
  - _Requirements: 17.4, 17.5, 17.6, 17.8, 17.9, 17.10_
  - _Depends: 11.4, 11.5, 11.7_

- [x]* 11.11 (P) 多言語入力の統合確認を行う
  - ヘルプデスク側で`en`・追加言語のタイトル/説明を入力して保存し、申請者側を`en`ロケールで取得すると`en`の内容、未登録ロケールでは`ja`にフォールバックすることを確認する（`revalidatePath`反映）
  - 日本語・英語両ロケールで、新規作成/編集フォームに言語タブ（ja/en＋追加）が表示され、言語追加・削除・エラータブ自動切替が機能することを確認する
  - `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 17.3, 17.8, 17.14_
  - _Depends: 11.7, 11.8_

---

## 追加ラウンド（2026-07-28）: ドキュメントのカテゴリ管理（要件18〜22）

> **着手順序（spec間依存）**: 本ラウンドは「documents一式」（`documents-management`＋`documents`）を担当する1エージェントが、**必ず本specのタスク12 → タスク13 → `documents`spec側のタスク14の順**に実装する。`documents`spec側（申請者側の大分類トップページ・大分類配下一覧・中分類絞り込み）は、本specが提供する型（`DocumentCategorySummary`・`DocumentCategoryDetail`・`DocumentSubCategoryOption`）と読み取り関数（`getVisibleDocumentCategories`・`getVisibleDocumentCategory`・`getDocumentsByCategory`）に読み取り専用で依存するため、本spec側のタスク12が完了するまで着手できない。
> **参考実装（そのまま横展開する）**: `DocumentTranslation`（`prisma/schema.prisma`）と`document-mapper.ts`の`DOCUMENT_INCLUDE`/`resolveDocumentContent`（→カテゴリ翻訳・名称解決）、`DocumentTargeting`の3列表現と`DocumentForm`のtargeting入力UI（→カテゴリの公開範囲）、`DocumentForm`の言語タブUI（→カテゴリ名の言語タブ）、`helpdesk-shared/ManagementList.tsx`の`ManagementListCard`/`Rows`/`Row`/`MessageCard`/`Skeleton`（→カテゴリ管理一覧）、`ConfirmDialog`（→カテゴリ削除確認）、`DocumentManagementFilterBar`（→カテゴリ絞り込みの追加）。
> **注意（運用）**: 本ラウンドのマイグレーションは新規2テーブル＋`Document`への2列追加を含む。本番反映には`prisma migrate deploy`の手動実行が別途必要。また既存の登録済みドキュメントは`categoryId`がNULLのままとなり、カテゴリ整備と再割当が完了するまで申請者側から到達できない（要件18.4の備考・design.mdのSecurity Considerations参照）。

- [x] 12. ドキュメントカテゴリのデータモデル・サービス・API基盤を実装する（要件18〜21）

- [x] 12.1 Prismaにカテゴリモデル・翻訳テーブル・ドキュメントへの参照列を追加しマイグレーションを生成する（要件18.1, 18.2, 18.3, 18.4, 20.1, 20.2, 21.1）
  - `prisma/schema.prisma`に`model DocumentCategory`（`parentId String?`＋名前付き自己参照リレーション`DocumentCategoryHierarchy`（`onDelete: Restrict`）・`name`・`displayOrder Int @default(0)`・既存`DocumentTargetingScope`を再利用した`targetingScope`/`targetingCountries`/`targetingCompanyCodes`・`createdAt`/`updatedAt`・`@@index([parentId, displayOrder])`）を追加する（新規enumは追加しない）
  - `model DocumentCategoryTranslation`（`categoryId`・`locale`・`name`・`@@unique([categoryId, locale])`・`@@index([categoryId])`・`onDelete: Cascade`）を`DocumentTranslation`と同型で追加する
  - `Document`に`categoryId String?`・`subCategoryId String?`と2つの名前付きリレーション（`DocumentPrimaryCategory`・`DocumentSubCategory`、いずれも`onDelete: Restrict`）を追加する
  - `prisma migrate dev`で`add_document_categories`マイグレーションを生成する（**既存`Document`行へのカテゴリ自動割当・データ移行は行わない**＝後方互換）
  - 同一階層の名称一意性はDB制約で表現しない（PostgreSQLの一意制約はNULL同士を別値として扱い大分類同士に効かないため。判定はタスク12.6で実装する）
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 20.1, 20.2, 21.1_
  - _Boundary: schema.prisma, migration_

- [x] 12.2 カテゴリのドメイン型を定義する（要件18.1, 18.3, 20.1, 21.1）
  - `src/types/document-category.ts`（新規）に`DocumentCategoryTranslationView`・`DocumentCategory`（`parentId`・`name`・`displayOrder`・`targeting`・`translations`）・`DocumentCategoryAdminView`（`documentCount`＋`children`）・`DocumentCategoryAdminChildView`・`CreateDocumentCategoryInput`・`UpdateDocumentCategoryInput`（`parentId`を含まない）・`DocumentCategoryMoveDirection`を定義する
  - 申請者側向けの表示型`DocumentCategorySummary`（`id`・`name`・`documentCount`）・`DocumentCategoryDetail`（`id`・`name`・`subCategories`）・`DocumentSubCategoryOption`を定義する
  - `targeting`は`types/document.ts`の既存`DocumentTargeting`を再利用し、公開範囲の型を二重定義しない
  - 型チェックが通ることで完了とする
  - _Requirements: 18.1, 18.3, 20.1, 21.1_
  - _Boundary: types/document-category.ts_
  - _Depends: 12.1_

- [x] 12.3 (P) ドキュメント型にカテゴリ参照を追加する（要件18.3, 18.4）
  - `src/types/document.ts`の`DocumentBase`に`categoryId: string | null`・`subCategoryId: string | null`を追加する（`CreateDocumentInput`にも自動で含まれる）
  - カテゴリ名は`Document`に持たせない（画面側はカテゴリ一覧を辞書として受け取る方式のため、`DOCUMENT_INCLUDE`は変更しない）
  - 型チェックが通ることで完了とする
  - _Requirements: 18.3, 18.4_
  - _Boundary: types/document.ts_
  - _Depends: 12.1_

- [x] 12.4 カテゴリのマッパーと名称の表示解決を実装する（要件20.1, 20.2, 20.8）
  - `src/lib/server/document-category-mapper.ts`（新規）に`DOCUMENT_CATEGORY_INCLUDE = { translations: true }`・`mapDocumentCategory`・`resolveDocumentCategoryContent(category, locale)`（フォールバック順`locale`→`en`→`ja`。`resolveDocumentContent`と同一順序）を実装する
  - 既定言語は`document-mapper.ts`の`DEFAULT_DOCUMENT_LOCALE`を再利用し、カテゴリ専用の定数を新設しない
  - `document-mapper.ts`の`mapTargeting`の引数型を、`Document`レコード固定から3列（`targetingScope`/`targetingCountries`/`targetingCompanyCodes`）を持つ構造的な型へ緩め、カテゴリからも再利用できるようにする（既存呼び出しは構造的部分型のため無変更で通ること）
  - _Requirements: 20.1, 20.2, 20.8_
  - _Boundary: document-category-mapper, document-mapper_
  - _Depends: 12.2_

- [x] 12.5 ドキュメントのマッパー・サービスをカテゴリ対応にし可視性述語を共有可能にする（要件18.4, 18.13, 21.6）
  - `document-mapper.ts`の`mapDocument`の`base`に`categoryId`・`subCategoryId`を追加する
  - `document-service.ts`の`toDocumentData`の両`sourceType`分岐に`categoryId`・`subCategoryId`を追加する（`sourceType`・`targeting`・`status`・翻訳と独立して保存されること）
  - `document-service.ts`のプライベート関数`visibleToWhere`を`documentVisibleToWhere`として**export**し、カテゴリサービスから再利用できるようにする（可視性述語を2箇所に書かない）。既存の`listDocumentsVisibleTo`/`findDocumentVisibleTo`は名称変更のみで挙動不変
  - `listVisibleDocumentsInCategory(categoryId, country, companyCode, locale)`を追加する（`categoryId`一致＋`documentVisibleToWhere`、アップロード日降順、`resolveDocumentContent`で解決）。既存`listDocumentsVisibleTo`のシグネチャは変更しない
  - _Requirements: 18.4, 18.13, 21.6_
  - _Boundary: document-mapper, document-service_
  - _Depends: 12.3, 12.4_

- [x] 12.6 カテゴリのCRUDと階層・名称の整合検証を実装する（要件18.2, 19.3, 19.4, 19.5, 19.6, 20.6, 20.7, 21.5, 21.9）
  - `src/lib/server/document-category-service.ts`（新規）に、ヘルプデスク側の`listDocumentCategoriesForHelpdesk`（大分類を`displayOrder`昇順・配下の中分類も`displayOrder`昇順・翻訳をinclude・各カテゴリの紐づくドキュメント件数を同梱。公開範囲で絞らない＝要件21.9）と`findDocumentCategoryForHelpdesk`を実装する
  - `createDocumentCategoryRecord`を実装する: 親指定時は親の存在と「親自身が大分類であること」を検証し、違反は階層エラーとして拒否する（要件18.2）。同一階層（大分類同士／同一大分類配下の中分類同士）の既定言語名称の重複は名称衝突エラーとして拒否する（要件19.6）。翻訳行は`en`必須＋任意追加言語をネスト作成する（`ja`行は作らない）
  - `updateDocumentCategoryRecord`を実装する: 名称・公開範囲・翻訳（全置換）を更新し、`parentId`・`displayOrder`は更新対象外とする（所属大分類の付け替えはスコープ外）。名称重複判定は自分自身を除外する
  - カテゴリ操作用の例外型（未検出・名称衝突・階層違反・使用中）を定義し、Server Actions側が種別を判別できるようにする
  - _Requirements: 18.2, 19.3, 19.4, 19.5, 19.6, 20.6, 20.7, 21.5, 21.9_
  - _Boundary: document-category-service_
  - _Depends: 12.4_

- [x] 12.7 カテゴリの表示順の採番と並び替えを実装する（要件19.10, 19.11）
  - 作成時の`displayOrder`を同一階層の最大値＋1（末尾追加）として採番する
  - `moveDocumentCategoryRecord(id, direction)`で、同一階層（同一`parentId`）の`displayOrder`順に隣接する1件と`displayOrder`をトランザクションで入れ替える。先頭で「上へ」・末尾で「下へ」の場合は何も変更しない
  - 同値の`displayOrder`が生じた場合でも順序が決定的になるよう、一覧取得の並び順に第2ソートキー（`createdAt`昇順）を併用する
  - _Requirements: 19.10, 19.11_
  - _Boundary: document-category-service_
  - _Depends: 12.6_

- [x] 12.8 カテゴリ削除の安全チェックを実装する（要件19.8, 19.9, 19.10, 19.12）
  - `deleteDocumentCategoryRecord(id)`で、削除直前に「当該カテゴリに紐づくドキュメント件数」（大分類は大分類参照一致・中分類は中分類参照一致）と「配下の中分類件数」を再取得し、いずれかが1件以上なら**件数を保持した使用中エラー**を送出して削除しない（要件19.8・19.9・19.12）
  - 両方0件のときのみ削除し、翻訳行が連鎖削除されることを確認する（要件19.10）
  - UI表示用の件数はタスク12.6の一覧取得が返す値を用いる方針とし、削除ボタン押下時に追加の件数取得を行わない（実行時の再確認はサーバー側の本タスクが担う二層構成）
  - _Requirements: 19.8, 19.9, 19.10, 19.12_
  - _Boundary: document-category-service_
  - _Depends: 12.6_

- [x] 12.9 申請者向けの可視カテゴリ取得と表示解決を実装する（要件20.8, 21.6, 21.7, 21.8, 21.10）
  - `listVisibleDocumentCategories(country, companyCode, locale)`を実装する: ①自社に可視な公開済みドキュメントを大分類参照でグルーピングして「大分類ID→可視件数」を得る（未分類＝参照NULLは除外＝要件20.10相当） ②カテゴリ自体の公開範囲が自社に及ぶ大分類を`displayOrder`昇順で取得し、①の件数が1件以上のものだけを残す（要件21.6のAND条件） ③`resolveDocumentCategoryContent`で名称を解決し件数を添えて返す
  - `findVisibleDocumentCategory(id, country, companyCode, locale)`を実装する: 「大分類であり、かつカテゴリ自体が自社に可視」のときのみ返し、それ以外（非可視・不存在・中分類ID）は`null`を返す（要件21.8）。配下の中分類は**中分類自体の公開範囲のみ**で絞り込み（配下ドキュメント件数の条件は課さない＝要件21.7）、`displayOrder`昇順・名称解決済みで返す
  - ドキュメント自体の可視性判定（公開範囲・公開状態）は変更しないことをコードレビューで確認する（要件21.10）
  - _Requirements: 20.8, 21.6, 21.7, 21.8, 21.10_
  - _Boundary: document-category-service_
  - _Depends: 12.5, 12.6_

- [x] 12.10 ドキュメントの大分類・中分類の親子整合検証を実装する（要件18.9, 18.10）
  - `assertDocumentCategoryPair(categoryId, subCategoryId)`を実装する: 大分類の存在と「大分類であること」、中分類が非nullのときは「指定された大分類の配下であること」を検証し、違反は不整合エラーとして拒否する。中分類がnullのときは受理する
  - zodスキーマでは他レコードを参照できないため、この検証だけはサービス層が担う方針を明記する
  - _Requirements: 18.9, 18.10_
  - _Boundary: document-category-service_
  - _Depends: 12.6_

- [x] 12.11 カテゴリのバリデーションを実装し、ドキュメント側にカテゴリ必須を追加する（要件18.6, 18.10, 19.5, 20.3, 20.4, 20.5, 20.11, 21.2, 21.3, 21.12）
  - `src/lib/validation/document.ts`のtargetingサブスキーマを**export**し、公開範囲の検証定義を二重に持たないようにする（要件21.2・21.3）
  - `src/lib/validation/document-category.ts`（新規）に`documentCategoryFormSchema`を実装する: `parentId`（nullable）・`name`（ja必須）・`nameEn`（実質必須）・`translations`（追加言語）・`targeting`。`superRefine`で`en`名称必須・言語コード重複禁止（`ja`/`en`/追加言語間）・追加言語件数上限（20、既存と同値）を検証し、`transform`で`nameEn`を翻訳行の`en`へ合成する（`documentFormSchema`のロジックをそのまま写経。再パース時の冪等性も踏襲）。入力/出力の2型をexportする
  - `documentUploadSchema`・`documentGoogleSchema`の共通フィールドに大分類（必須＝要件18.6）・中分類（任意・既定null）を追加する。親子整合はスキーマでは検証せず、タスク12.10とフォームの選択肢制御に委ねる
  - _Requirements: 18.6, 18.10, 19.5, 20.3, 20.4, 20.5, 20.11, 21.2, 21.3, 21.12_
  - _Boundary: validation/document-category.ts, validation/document.ts_
  - _Depends: 12.2_

- [x] 12.12 カテゴリのAPI層とServer Actionsを実装し、ドキュメント側の再検証対象を拡張する（要件18.9, 18.10, 18.14, 19.12, 19.13, 21.9, 21.12）
  - `src/lib/api/document-categories.ts`（新規）に、申請者向け（`getVisibleDocumentCategories`・`getVisibleDocumentCategory`）とヘルプデスク向け（`getAllDocumentCategories`・`getDocumentCategoryById`・`createDocumentCategory`・`updateDocumentCategory`・`deleteDocumentCategory`・`moveDocumentCategory`）を実装し、既存`api/documents.ts`と同じセッション境界（申請者／ヘルプデスクのセッション必須）をこの層で適用する
  - `src/lib/api/documents.ts`に`getDocumentsByCategory(categoryId, options?: { locale?: string })`を追加する（申請者セッション必須）。既存`getDocuments`・`getDocumentById`のシグネチャは変更しない
  - `src/lib/actions/document-categories.ts`（新規、`"use server"`）に作成・更新・削除・並び替えのServer Actionsを実装する。作成・更新は`documentCategoryFormSchema`でサーバー側再検証を行い（要件19.12・21.12）、スキーマで表現できない検証（名称重複・階層・使用中）はサービス層の例外をそのまま送出する
  - カテゴリ変更時の再検証対象（要件19.13）に、カテゴリ管理画面・ドキュメント管理一覧・ドキュメントの新規作成/編集画面・申請者側トップページ・申請者側の大分類配下一覧を含める
  - `src/lib/actions/documents.ts`の作成・更新アクションで、スキーマ検証後に大分類・中分類の親子整合検証（タスク12.10）を呼び出してから保存する（要件18.9・18.10）。既存の再検証対象に申請者側の大分類配下一覧を追加し、2026-07-09に撤廃済みの申請者側詳細パスの再検証を新パスへ置き換える（要件18.14）
  - _Requirements: 18.9, 18.10, 18.14, 19.12, 19.13, 21.9, 21.12_
  - _Boundary: api/document-categories.ts, api/documents.ts, actions/document-categories.ts, actions/documents.ts_
  - _Depends: 12.6, 12.7, 12.8, 12.9, 12.10, 12.11_

---

- [x] 13. カテゴリ管理画面とドキュメント側UIをカテゴリ対応にする（要件18, 19, 20, 22）

- [x] 13.1 (P) カテゴリ管理画面の翻訳キーを追加する（要件19.14, 20.12, 21.11）
  - `messages/ja.json`・`messages/en.json`に新規名前空間`helpdeskDocumentCategories`を追加する（`list`: 見出し・説明・戻る導線・0件・エラー・大分類/中分類の追加・編集・上へ/下へ・件数表示・公開範囲ラベル、`list.delete`: 削除ボタン・確認見出し・確認本文（対象名埋め込み）・確認/キャンセル・エラー・**ドキュメント件数入りの削除拒否文言**・**中分類件数入りの削除拒否文言**、`form`: 追加/編集の見出し・名称・公開範囲・国/販社・送信/キャンセル・送信エラー、`form.language`: `helpdeskDocuments.form.language`と同一キー構成、`form.validation`: 必須・名称重複）
  - 公開範囲の選択肢ラベル等、既存`helpdeskDocuments`で解決できるものは再利用し二重定義しない（要件21.11）
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 19.14, 20.12, 21.11_
  - _Boundary: i18n messages_

- [x] 13.2 (P) ドキュメント側のカテゴリ関連翻訳キーを追加する（要件18.15, 22.10）
  - `helpdeskDocuments.form`にカテゴリ選択のラベル・未選択/なしの選択肢・カテゴリ必須エラー・親子不整合エラーを追加する
  - `helpdeskDocuments.list`に大分類/中分類のラベル・カテゴリ未設定表示・カテゴリ管理画面への導線ラベルを追加する
  - `helpdeskDocuments.list.filter`に大分類/中分類の絞り込みラベルと選択肢ラベル（すべての大分類・すべての中分類・未設定）を追加する
  - `ja.json`・`en.json`のキー構造が一致していることで完了とする
  - _Requirements: 18.15, 22.10_
  - _Boundary: i18n messages_

- [x] 13.3 カテゴリ管理画面の階層一覧を実装する（要件19.1, 19.15, 19.16, 20.10, 21.5）
  - `/helpdesk/documents/categories`のルートを追加し、既存の管理一覧ページと同じ`Suspense`＋スケルトン構成にする（静的セグメントのため既存の`[id]/edit`と競合しないことを確認する）
  - サーバーコンポーネントでカテゴリ全件・国/販社ラベル辞書・公開範囲ラベルを解決し、ドキュメント管理一覧へ戻る導線と見出しを描画する。取得失敗時・0件時のメッセージ表示を含める（要件19.15）
  - クライアントコンポーネントで大分類行＋配下の中分類行を階層が分かるインデント付きで描画し、各行に公開範囲（全体公開／対象国名／対象販社名）と紐づくドキュメント件数を表示する（要件19.1・21.5）。表示するカテゴリ名は既定言語（ja）とする（要件20.10）
  - 追加（大分類／中分類）・編集・削除・並び替えの操作要素を配置し、ダイアログの開閉状態を保持する。UI文字列はクライアント側で解決する（ラベルpropsの過剰な増加を避ける既存方針を踏襲）
  - 既存の共有一覧コンポーネント（`ManagementListCard`/`Rows`/`Row`/`MessageCard`/`Skeleton`）を利用し、`helpdesk-shared/ManagementList.tsx`自体は変更しない。「追加」がダイアログ起動のため`ManagementListHeading`は使わず、同等のマークアップを本画面側に用意する
  - タブレット幅（768px以上）で横スクロールが発生しないことを確認する（要件19.16）
  - _Requirements: 19.1, 19.15, 19.16, 20.10, 21.5_
  - _Boundary: helpdesk-document-categories, app/helpdesk/documents/categories_
  - _Depends: 12.12, 13.1_

- [x] 13.4 カテゴリの追加・編集フォームをダイアログで実装する（要件19.3, 19.4, 19.5, 19.6, 20.3, 20.4, 20.5, 20.6, 20.7, 21.2, 21.3）
  - 既存`Dialog`を用いて「大分類を追加」「中分類を追加（開いた行の大分類を親として固定＝親選択UIは持たない）」「編集」の3モードのフォームを実装する（要件19.3・19.4）
  - 名称は`DocumentForm`と同型の言語タブUI（固定ja/enタブ＋任意の追加言語タブの動的追加/削除・新規タブ/エラータブへの自動切替）で入力し、ja/en必須・言語コード重複時はエラーのあるタブへ切り替えて保存をブロックする（要件20.3・20.4・20.5）。編集時は登録済みの各言語を初期値として復元する（要件20.7）
  - 公開範囲は既存`DocumentForm`のtargeting入力と同型（種別Select＋国／販社の複数選択Select）とし、国選択肢・販社マスタを再利用する。国/販社を選ぶ種別で0件選択のまま保存しようとした場合は保存をブロックする（要件21.2・21.3）
  - 公開範囲・所属大分類は言語に依存しない共通項目として言語タブの外側に配置する。表示順はフォームでは扱わず、作成時は末尾へ自動採番される（並び替えはタスク13.6）
  - 保存はカテゴリのServer Actionsを呼び、成功時はダイアログを閉じて一覧を再取得する。名称重複・階層違反等のサーバー側エラーは対応するメッセージを表示する（要件19.5・19.6）
  - _Requirements: 19.3, 19.4, 19.5, 19.6, 20.3, 20.4, 20.5, 20.6, 20.7, 21.2, 21.3_
  - _Boundary: helpdesk-document-categories_
  - _Depends: 13.3_

- [x] 13.5 カテゴリの削除操作を実装する（要件19.7, 19.8, 19.9, 19.10）
  - 削除可能（紐づくドキュメント0件かつ配下の中分類0件）な場合のみ、共通`ConfirmDialog`で確認を求め、確認本文に対象カテゴリ名を明示する（要件19.7）
  - 紐づくドキュメントが1件以上ある場合は確認ダイアログを開かず、**件数を明示したエラーメッセージ**を表示し操作をブロックする（要件19.8）。配下に中分類が1件以上ある場合も同様に中分類の件数を明示してブロックする（要件19.9）
  - 件数は一覧取得が返す値を用い、削除ボタン押下時の追加取得を行わない。確定時はサーバー側の削除処理（実行時の再確認を含む）を呼び出し、成功後に一覧・カテゴリ選択肢・絞り込み選択肢から除去されることを確認する（要件19.10）
  - _Requirements: 19.7, 19.8, 19.9, 19.10_
  - _Boundary: helpdesk-document-categories_
  - _Depends: 13.3_

- [x] 13.6 (P) カテゴリの並び替え操作を実装する（要件19.11）
  - 各行に「上へ」「下へ」の操作を配置し、大分類同士・同一大分類配下の中分類同士の表示順を変更できるようにする
  - 同一階層の先頭では「上へ」、末尾では「下へ」を無効化する。変更後は一覧を再取得して新しい順序が反映されることを確認する
  - _Requirements: 19.11_
  - _Boundary: helpdesk-document-categories_
  - _Depends: 13.3_

- [x] 13.7 ドキュメント管理一覧からカテゴリ管理画面への導線を追加する（要件19.2）
  - ドキュメント管理一覧の見出し付近にカテゴリ管理画面へのリンクを追加する（既存の「新規作成」導線は変更しない）
  - _Requirements: 19.2_
  - _Boundary: DocumentManagementList_
  - _Depends: 13.2, 13.3_

- [x] 13.8 DocumentFormに大分類・中分類の選択を追加する（要件18.5, 18.6, 18.7, 18.8, 18.13, 20.10）
  - 新規作成・編集ページでカテゴリ全件を取得し、既定言語（ja）の名称を持つ選択肢（大分類とその配下の中分類）としてフォームへ渡す（要件20.10）
  - `DocumentForm`に大分類の選択（必須）と中分類の選択（任意・未選択を許容）を追加し、未選択のまま保存しようとした場合は保存をブロックして入力を促す（要件18.5・18.6）
  - 中分類の選択肢を、選択中の大分類配下のものだけに限定する（要件18.7）。大分類が**実際に変更されたとき**のみ中分類選択をリセットし、編集時の初期値がマウント時に消えないようにする（要件18.8）
  - カテゴリ選択欄は言語タブの外側、公開状態・公開範囲と並ぶ共通項目として配置する（要件18.13）
  - _Requirements: 18.5, 18.6, 18.7, 18.8, 18.13, 20.10_
  - _Boundary: DocumentForm, app/helpdesk/documents/new, app/helpdesk/documents/[id]/edit_
  - _Depends: 12.11, 12.12, 13.2_

- [x] 13.9 (P) 表示モードにカテゴリを表示する（要件18.11）
  - `DocumentDetailPanel`の表示モードの読み取り専用情報に大分類・中分類名（未設定時はその旨）を追加する。名称はフォーム用に受け取っているカテゴリ選択肢から導出し、新規propsを増やさない
  - _Requirements: 18.11_
  - _Boundary: DocumentDetailPanel_
  - _Depends: 13.8_

- [x] 13.10 管理一覧にカテゴリ表示と大分類・中分類の絞り込みを追加する（要件18.11, 22.1〜22.11）
  - ドキュメント管理一覧（サーバー側）でカテゴリ全件を取得し、クライアント側へ渡す。クライアント側でID→名称の辞書を作り、各行に大分類・中分類名（未設定時はその旨）を表示する（要件18.11）
  - 絞り込みバーに大分類（すべて／各大分類／未設定）と中分類（すべて／選択中の大分類配下のみ）のセレクトを追加する。センチネル（すべて・未設定）とカテゴリIDを型安全に区別できる値表現とその変換ヘルパーを定数モジュールに定義する（要件22.1・22.2）
  - 大分類を「すべて」または「未設定」に変更したとき、中分類の選択を「すべて」へリセットする（要件22.3）
  - キーワード・登録方式・公開範囲種別・大分類・中分類のすべての条件を満たすものだけを表示する（AND条件、要件22.4）。即時反映・条件クリアへのカテゴリ条件の追加・条件変更時の先頭ページへのリセット・絞り込み後0件メッセージ・並び順と行表示項目/導線の維持を確認する（要件22.5〜22.9）
  - 絞り込みバーのレイアウトを拡張し、タブレット幅（768px以上）で横スクロールが発生しないことを確認する（要件22.11）
  - _Requirements: 18.11, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.11_
  - _Boundary: DocumentManagementList, DocumentManagementListClient, DocumentManagementFilterBar, constants/document.ts_
  - _Depends: 12.12, 13.2_

- [x] 13.11 (P) seedにカテゴリを投入し既存seedドキュメントへ割り当てる
  - `prisma/seed.ts`・`prisma/seed.sql`に大分類3件程度＋いくつかの中分類（`en`翻訳行と公開範囲のバリエーションを含む）を投入し、既存のseedドキュメント5件に大分類（一部は中分類も）を割り当てる
  - これはseedデータのみの整備であり、本番の既存レコードへの自動割当（要件18.4で禁止）とは別物であることをコメント等で明示する
  - _Requirements: 18.4_
  - _Boundary: prisma/seed_
  - _Depends: 12.1_

- [x]* 13.12 (P) データ層・サービス層の単体テストを追加する
  - カテゴリのマッパーが翻訳・公開範囲・表示順・親子関係を正しくマッピングすること、名称の表示解決が`locale`→`en`→`ja`の順にフォールバックすることを検証する
  - 作成が同一階層の末尾に表示順を採番すること、中分類の下に中分類を作ろうとすると拒否されること、同一階層の名称重複が拒否されること（更新時は自分自身を除外すること）を検証する
  - 並び替えが隣接レコードと表示順を入れ替えること、先頭で「上へ」・末尾で「下へ」は何も変えないこと、他階層を巻き込まないことを検証する
  - 削除が「紐づくドキュメント1件以上」「配下の中分類1件以上」のいずれでも正しい件数を伴って拒否されること、両方0件のときのみ削除され翻訳行が連鎖削除されることを検証する
  - 親子整合検証が、存在しない大分類・大分類として指定された中分類・親が一致しない中分類を拒否し、中分類なしを受理することを検証する
  - 大分類配下のドキュメント取得が当該大分類のみ（中分類未設定も含む）を返し、下書き・公開範囲外を除外することを検証する
  - _Requirements: 18.2, 18.9, 19.5, 19.6, 19.8, 19.9, 19.10, 19.11, 20.8, 21.6_
  - _Depends: 12.6, 12.7, 12.8, 12.9, 12.10_

- [x]* 13.13 (P) 可視カテゴリ判定・バリデーション・UIの単体テストを追加・更新する
  - 可視カテゴリ取得が「カテゴリ自体が可視」かつ「配下に自社可視の公開済みドキュメントが1件以上」の大分類のみを表示順で返すこと、件数が下書き・公開範囲外・未分類を計上しないことを検証する
  - 単一取得が非可視カテゴリ・中分類ID・存在しないIDに対して`null`を返すこと、配下の中分類が可視のもののみ・表示順で返ることを検証する
  - カテゴリのバリデーションが ja/en 名称未入力・言語コード重複・追加言語件数上限超過・公開範囲0件選択を拒否し、`en`名称が翻訳行へ合成されること（再パースが冪等であること）を検証する
  - ドキュメントのバリデーションが大分類未指定を拒否し、中分類未指定を「なし」として受理すること（アップロード/Google両方式）を検証する
  - カテゴリ管理一覧が階層と件数を描画すること、削除操作が件数>0のとき確認ダイアログを開かず件数入りメッセージを表示すること、フォームが言語タブと公開範囲を扱えることを検証する
  - `DocumentForm`が大分類の変更時に中分類選択をリセットし、編集時の初期値はマウント時にリセットされないことを検証する
  - 管理一覧のクライアント側絞り込みが5条件のAND条件で機能すること、「未設定」でカテゴリ未割当のみを抽出できること、大分類を「すべて」に戻すと中分類選択がリセットされることを検証する
  - 既存の`DocumentForm`・`DocumentManagementList(Client)`・`document-service`・`document-mapper`・バリデーションの各テストを追従させ、全テストがパスすることで完了とする
  - _Requirements: 18.6, 18.8, 19.8, 19.9, 20.4, 20.5, 21.2, 21.6, 21.7, 21.8, 22.1, 22.3, 22.4_
  - _Depends: 13.4, 13.5, 13.8, 13.10_

- [x]* 13.14 カテゴリ機能の統合確認と移行手順の確認を行う
  - カテゴリを作成 → ドキュメントに割当 → 当該カテゴリの削除が件数付きで拒否される → ドキュメントのカテゴリを変更すると削除できる、という一連の流れを確認する
  - 大分類の公開範囲を自社対象外に変更する／配下の全ドキュメントを下書きにすると、申請者側のトップページから当該大分類が消えること（`revalidatePath`反映）を確認する
  - カテゴリ名の`en`翻訳を登録し、`en`ロケールでは`en`の名称、未登録ロケールでは`ja`の名称が表示されることを確認する。並び替え後に申請者側の大分類の順序が変わることも確認する
  - 日本語・英語両ロケールでカテゴリ管理画面の追加・編集・削除・並び替えが機能し、タブレット幅（768px）でカテゴリ管理画面と拡張後の絞り込みバーが横スクロールを起こさないことを確認する
  - 移行運用として、マイグレーション適用直後は既存ドキュメントがカテゴリ未設定であり申請者側から到達できないこと、管理一覧の「未設定」絞り込みで対象を抽出して割当できることを確認する
  - `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 18.4, 18.14, 19.13, 20.8, 21.6, 22.1_
  - _Depends: 13.10, 13.11_
