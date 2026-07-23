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
