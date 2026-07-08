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
