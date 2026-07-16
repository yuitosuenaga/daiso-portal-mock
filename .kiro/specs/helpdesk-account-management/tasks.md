# 実装タスク: helpdesk-account-management

## 基盤: 型・定数・マイグレーション・バリデーション・翻訳キー

- [x] 1. `ApplicantUser`モデルに`isActive`フィールドを追加し、マイグレーションを作成する
  - `prisma/schema.prisma`の`ApplicantUser`モデルに`isActive Boolean @default(true)`を追加する（既存フィールドは変更しない）
  - `npx prisma migrate dev`でマイグレーションファイルを作成し、既存の`seed.ts`投入済みデータが後方互換に移行されることを確認する
  - `npx prisma generate`でPrisma Clientの型が更新されることで完了とする
  - _Requirements: 7.3, 7.5, 7.7_
  - _Boundary: prisma/schema.prisma_

- [x] 2. (P) Company関連の型を追加する
  - `src/types/company.ts`（新規）に`CompanyWithStats`（`Company`+`applicantUserCount`）・`CreateCompanyInput`（`{ name; country; companyCode }`）を追加する
  - `npx tsc --noEmit`が通ることで完了とする
  - _Requirements: 1.2, 2.1_
  - _Boundary: Company型定義_

- [x] 3. (P) ApplicantUser関連の型を追加する
  - `src/types/applicant-user.ts`（新規）に`ApplicantUserSummary`（`{ id; email; displayName; isActive; companyId; createdAt }`、`passwordHash`を含まない）・`CreateApplicantUserInput`（`{ email; displayName; password }`）・`UpdateApplicantUserInput`（`{ email; displayName; password? }`）を追加する
  - `npx tsc --noEmit`が通ることで完了とする
  - _Requirements: 4.2, 5.1, 6.1, 6.4_
  - _Boundary: ApplicantUser型定義_
  - _Depends: 1_

- [x] 4. (P) パスワード最小文字数の定数を追加する
  - `src/lib/constants/applicant-user.ts`（新規）に`APPLICANT_USER_PASSWORD_MIN_LENGTH`（8）を追加する
  - _Requirements: 5.5, 6.6_
  - _Boundary: applicant-user定数_

- [x] 5. (P) Companyフォームのzodスキーマを実装する
  - `src/lib/validation/company.ts`（新規）に、会社名・国・販社コードの未入力を拒否する`companyFormSchema`を実装する
  - 単体テストで、正常値の受理と各異常値（会社名未入力・国未入力・販社コード未入力）の拒否を検証し、通ることで完了とする
  - _Requirements: 2.2, 3.2_
  - _Boundary: companyFormSchema_
  - _Depends: 2_

- [x] 6. (P) ApplicantUserフォームのzodスキーマを実装する
  - `src/lib/validation/applicant-user.ts`（新規）に、メールアドレス形式・表示名必須・パスワード最小文字数（`APPLICANT_USER_PASSWORD_MIN_LENGTH`以上）を検証する`applicantUserCreateFormSchema`と、パスワードが空文字列または未指定を許容する`applicantUserUpdateFormSchema`を実装する
  - 単体テストで、正常値の受理、各異常値（メール形式不正・表示名未入力・パスワード短すぎ）の拒否、更新スキーマがパスワード空欄を許容することを検証し、通ることで完了とする
  - _Requirements: 5.2, 5.4, 5.5, 6.2, 6.5, 6.6_
  - _Boundary: applicantUserCreateFormSchema, applicantUserUpdateFormSchema_
  - _Depends: 3, 4_

- [x] 7. (P) 販社・申請者アカウント管理画面の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に、一覧・詳細・新規作成・編集画面の見出し・ラベル・ボタン・エラーメッセージ・確認ダイアログ・空状態メッセージの翻訳キー（`helpdeskCompanies`名前空間等）を追加する
  - `HelpdeskSidebar`のナビゲーション項目用の翻訳キーも追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 9.1, 10.1, 10.2_
  - _Boundary: i18n messages_

---

## コア: サービス層とServer Actions

- [x] 8. `company-service.ts`に管理画面向けCRUD関数を追加する
  - `src/lib/server/company-service.ts`の既存`listCompaniesForHelpdesk`はシグネチャ・実装を変更せず維持し、`listCompaniesForManagement`（`name`昇順・`_count`による`applicantUserCount`集計）・`getCompanyById`（存在しない場合`null`）・`createCompany`・`updateCompany`・`isCompanyCodeTaken(companyCode, excludeId?)`を`requireHelpdeskStaffSession`による検証込みでPrisma経由で実装する
  - 単体テストで、`listCompaniesForManagement`が`name`昇順・`applicantUserCount`付きで返すこと、`isCompanyCodeTaken`が`excludeId`指定時に自分自身を重複扱いしないこと、既存`listCompaniesForHelpdesk`の挙動が変化していないことを検証し、通ることで完了とする
  - _Requirements: 1.1, 1.2, 2.3, 2.4, 2.5, 3.3, 3.4, 4.1, 4.6, 8.2_
  - _Boundary: CompanyService_
  - _Depends: 2_

- [x] 9. `applicant-user-service.ts`を新規実装する
  - `src/lib/server/applicant-user-service.ts`（新規）に、`listApplicantUsersByCompany`（有効なアカウント優先・`displayName`昇順）・`getApplicantUserById`・`createApplicantUser`（`bcrypt.hash(password, 10)`でハッシュ化・`isActive: true`で作成）・`updateApplicantUser`（`password`未指定時は既存ハッシュを保持）・`setApplicantUserActive`・`isApplicantUserEmailTaken`（`ApplicantUser`・`HelpdeskStaff`双方を確認）を、`requireHelpdeskStaffSession`による検証込みでPrisma経由で実装する
  - 単体テストで、一覧の並び順、パスワードのハッシュ化、パスワード未指定時の既存ハッシュ保持、`isApplicantUserEmailTaken`が両テーブルを確認すること、存在しないIDへの操作がエラーになることを検証し、通ることで完了とする
  - _Requirements: 4.2, 4.3, 4.4, 5.3, 5.6, 5.7, 5.8, 5.9, 6.3, 6.5, 6.7, 7.3, 7.4, 7.7_
  - _Boundary: ApplicantUserService_
  - _Depends: 1, 3, 4_

- [x] 10. 無効化されたアカウントのログイン拒否を`authorize.ts`に追加する
  - `src/lib/server/authorize.ts`の`authorizeApplicantCredentials`内、`bcrypt.compare`成功後に`applicantUser.isActive`が`false`の場合は`null`を返す分岐を追加する。`authorizeHelpdeskCredentials`は変更しない
  - 単体テストで、`isActive: false`のアカウントに対して正しいパスワードでも`null`が返ること、`isActive: true`のアカウントは既存の挙動を維持することを検証し、通ることで完了とする
  - _Requirements: 7.5_
  - _Boundary: authorize.ts_
  - _Depends: 1_

- [x] 11. CompanyのServer Actionsを実装する
  - `src/lib/actions/companies.ts`（新規）に`"use server"`の`createCompanyAction`・`updateCompanyAction`を実装する。冒頭で`requireHelpdeskStaffSession()`を検証し、`companyFormSchema`でサーバー側再検証、`isCompanyCodeTaken`で重複確認後にサービス層を呼び出す
  - 各操作の最後にCompany一覧・詳細・編集ルートを`revalidatePath`で再検証する
  - 単体テストで、不正な入力・重複販社コードを拒否しDBを変更しないこと、成功時に対象ルートが再検証されることを検証し、通ることで完了とする
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 3.4, 8.2_
  - _Boundary: CompanyActions_
  - _Depends: 5, 8_

- [x] 12. ApplicantUserのServer Actionsを実装する
  - `src/lib/actions/applicant-users.ts`（新規）に`"use server"`の`createApplicantUserAction`・`updateApplicantUserAction`・`setApplicantUserActiveAction`を実装する。冒頭で`requireHelpdeskStaffSession()`を検証し、作成・更新は対応するzodスキーマでサーバー側再検証、`isApplicantUserEmailTaken`で重複確認後にサービス層を呼び出す
  - 各操作の最後に対象Company詳細ルート・ApplicantUser編集ルートを`revalidatePath`で再検証する
  - 単体テストで、不正な入力・重複メールアドレスを拒否しDBを変更しないこと、パスワード未入力の更新が既存ハッシュを保持すること、成功時に対象ルートが再検証されることを検証し、通ることで完了とする
  - _Requirements: 5.2, 5.3, 5.6, 5.8, 5.9, 6.2, 6.3, 6.5, 6.7, 6.8, 7.2, 7.3, 7.6, 7.7, 8.2_
  - _Boundary: ApplicantUserActions_
  - _Depends: 6, 9_

---

## コア: UIコンポーネントとページ

- [x] 13. `CompanyManagementList`・`CompanyManagementListClient`を実装する
  - `src/components/features/helpdesk-companies/CompanyManagementList.tsx`（新規、Server）に`listCompaniesForManagement()`を取得し、`CompanyManagementListClient.tsx`（新規、Client）で会社名・販社コードによるキーワード絞り込みを行う一覧を実装する
  - ローディング中のスケルトンUI、取得失敗時のエラーメッセージ、0件時の「販社が登録されていません」メッセージを表示する
  - 各行に会社名・国・販社コード・申請者アカウント数を表示し、新規作成画面・各会社の詳細画面への導線を配置する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - _Boundary: CompanyManagementList, CompanyManagementListClient_
  - _Depends: 8_

- [x] 14. `CompanyForm`を実装する
  - `src/components/features/helpdesk-companies/CompanyForm.tsx`（新規、Client）に、会社名（`Input`）・国（`Select`、既存`INQUIRY_COUNTRY_CODES`を再利用）・販社コード（`Input`）を持つ`react-hook-form`+`zod`フォームを実装する。新規作成・編集を共用する
  - 未入力のまま保存しようとしたとき保存操作をブロックし入力を促す。保存失敗（重複エラー等）時にエラーメッセージを表示し入力内容を保持する
  - 単体テストで、新規作成・編集それぞれの送信データが正しいこと、未入力時に送信がブロックされることを検証し、通ることで完了とする
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_
  - _Boundary: CompanyForm_
  - _Depends: 5, 11_

- [x] 15. `CompanyDetail`を実装する
  - `src/components/features/helpdesk-companies/CompanyDetail.tsx`（新規、Server）に、`getCompanyById`で取得した会社情報（会社名・国・販社コード）と、`listApplicantUsersByCompany`で取得したApplicantUser一覧（`ApplicantUserList`、タスク16）を組み立てる画面を実装する
  - 存在しないCompany IDが指定されたとき「会社が見つかりません」旨のメッセージを表示する
  - 編集画面・申請者アカウント新規作成画面への導線を配置する
  - _Requirements: 4.1, 4.5, 4.6_
  - _Boundary: CompanyDetail_
  - _Depends: 8, 9_

- [x] 16. (P) `ApplicantUserList`を実装する
  - `src/components/features/helpdesk-companies/ApplicantUserList.tsx`（新規、表示専用）に、各行にメールアドレス・表示名・有効状態（`Badge`）を表示し、編集リンクと`ToggleApplicantUserActiveButton`（タスク18）を配置する一覧を実装する
  - 0件時は「申請者アカウントが登録されていません」旨のメッセージを表示する
  - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - _Boundary: ApplicantUserList_
  - _Depends: 9_

- [x] 17. `ApplicantUserForm`を実装する
  - `src/components/features/helpdesk-companies/ApplicantUserForm.tsx`（新規、Client）に、メールアドレス（`Input`）・表示名（`Input`）・パスワード（`Input type="password"`、新規作成時は必須、編集時は空欄で既存パスワードを保持する旨の補助文言付き任意入力）を持つ`react-hook-form`+`zod`フォームを実装する。新規作成・編集を共用する
  - 未入力・パスワード短すぎのまま保存しようとしたとき保存操作をブロックし入力を促す。保存失敗（重複メールアドレス等）時にエラーメッセージを表示し入力内容（パスワード欄を除く）を保持する
  - 保存操作の完了後、パスワード入力欄をフォーム・画面上に残さない
  - 単体テストで、新規作成・編集それぞれの送信データが正しいこと、パスワード空欄での編集時に`password`が送信されないこと、未入力・パスワード短すぎ時に送信がブロックされることを検証し、通ることで完了とする
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.9, 6.1, 6.2, 6.4, 6.5, 6.6_
  - _Boundary: ApplicantUserForm_
  - _Depends: 6, 12_

- [x] 18. (P) `ToggleApplicantUserActiveButton`を実装する
  - `src/components/features/helpdesk-companies/ToggleApplicantUserActiveButton.tsx`（新規、Client）に、クリック時に`confirm()`で確認（無効化・再有効化でそれぞれ異なる確認文言）し、確認後に`setApplicantUserActiveAction`を呼び出すボタンを実装する
  - _Requirements: 7.1, 7.2, 7.6_
  - _Boundary: ToggleApplicantUserActiveButton_
  - _Depends: 12_

- [x] 19. ヘルプデスク側Company管理ページを実装する
  - `src/app/[locale]/helpdesk/(dashboard)/companies/page.tsx`（新規）に`CompanyManagementList`を配置する
  - `src/app/[locale]/helpdesk/(dashboard)/companies/new/page.tsx`（新規）に`CompanyForm`（新規作成モード）を配置する
  - `src/app/[locale]/helpdesk/(dashboard)/companies/[id]/page.tsx`（新規）に`CompanyDetail`を配置する
  - `src/app/[locale]/helpdesk/(dashboard)/companies/[id]/edit/page.tsx`（新規）に`getCompanyById`で取得した内容を初期値とした`CompanyForm`（編集モード）を配置する
  - ブラウザで一覧→新規作成→詳細→編集の一連の操作が行えることで完了とする
  - _Requirements: 1.6, 2.1, 3.1, 3.5, 4.1, 4.6_
  - _Boundary: CompanyListPage, CompanyNewPage, CompanyDetailPage, CompanyEditPage_
  - _Depends: 13, 14, 15_

- [x] 20. ヘルプデスク側ApplicantUser管理ページを実装する
  - `src/app/[locale]/helpdesk/(dashboard)/companies/[id]/applicant-users/new/page.tsx`（新規）に、対象Companyを解決した上で`ApplicantUserForm`（新規作成モード）を配置する
  - `src/app/[locale]/helpdesk/(dashboard)/companies/[id]/applicant-users/[userId]/edit/page.tsx`（新規）に`getApplicantUserById`で取得した内容を初期値とした`ApplicantUserForm`（編集モード）と`ToggleApplicantUserActiveButton`を配置する。存在しないApplicantUser IDが指定されたとき「アカウントが見つかりません」旨のメッセージを表示する
  - ブラウザでCompany詳細→申請者アカウント新規作成→編集→無効化→再有効化の一連の操作が行えることで完了とする
  - _Requirements: 4.5, 5.1, 6.1, 6.9, 7.1, 7.6_
  - _Boundary: ApplicantUserNewPage, ApplicantUserEditPage_
  - _Depends: 16, 17, 18_

- [x] 21. `HelpdeskSidebar`に販社管理のナビゲーション項目を追加する
  - `HELPDESK_NAV_ITEMS`に「販社管理」（`/helpdesk/companies`）を追加し、現在表示中のページに対応する項目をアクティブ状態で強調表示する
  - _Requirements: 9.1, 9.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 19_

---

## 検証

- [x] 22. 認可（ヘルプデスクセッション限定）を確認する
  - ヘルプデスクセッションなしで本specの全画面URL（`/helpdesk/companies`配下）へ直接アクセスすると、ヘルプデスクログイン画面へリダイレクトされることを確認する
  - 本specの全Server Actions・データアクセス関数がヘルプデスクセッションを検証していることをコードレビューで確認する（`requireHelpdeskStaffSession`の呼び出し漏れがないこと）
  - _Requirements: 8.1, 8.2, 8.3_
  - _Depends: 21_

- [x] 23. 無効化されたアカウントのログイン拒否を確認する
  - ApplicantUserを無効化した後、当該アカウントの（無効化前の）正しいメールアドレス・パスワードでのログインが失敗することを確認する
  - 再有効化後、同じ認証情報でログインが成功することを確認する
  - _Requirements: 7.5, 7.7_
  - _Depends: 21_

- [x] 24. `tsc --noEmit`・`npm run lint`・`npm test`・`npm run build`が全て通ることを確認する
  - _Requirements: 1.1〜11.1_
  - _Depends: 22, 23_

- [x]* 25. 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで一覧・詳細・新規作成・編集画面が表示され、ラベル・エラーメッセージ・確認ダイアログの文言が正しく切り替わることを確認する
  - タブレット幅（768px）で新規作成・編集画面が横スクロールを起こさないことを確認する
  - _Requirements: 10.1, 10.2, 11.1_
  - _Depends: 24_
