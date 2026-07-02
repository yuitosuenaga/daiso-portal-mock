# 実装タスク: announcements-management

## 実装計画

- [x] 1. 基盤: 型・共有定数・翻訳キーの追加
- [x] 1.1 `Announcement`型への配信対象フィールド追加と共有定数の切り出し
  - `types/announcement.ts`に`AnnouncementTargeting`（`{scope:"all"} | {scope:"countries", countries: string[]}`）を定義し、`Announcement`に`targeting`フィールドを追加する
  - `lib/constants/current-company.ts`を新設し、`lib/api/inquiries.ts`内の`MOCK_CURRENT_COMPANY`をそこへ移動する。`inquiries.ts`はこの新しい定数をimportして参照する（挙動は変更しない）
  - `lib/api/announcements.ts`の既存5件のシードデータ全件に`targeting: { scope: "all" }`を付与する
  - 既存の`inquiries.test.ts`が変更なくパスし、`getAnnouncements()`が既存5件全てを引き続き返すことで完了とする
  - _Requirements: 5.4, 6.1_
  - _Boundary: AnnouncementsMockApi, CurrentCompany_

- [x] 1.2 (P) お知らせフォームのバリデーションスキーマを実装する
  - `lib/validation/announcement.ts`にタイトル・本文・種別必須、配信対象は`discriminatedUnion`（`scope:"all"`または`scope:"countries"`で国を1件以上）を検証する`zod`スキーマを定義する
  - タイトル・本文・種別が未入力、または`scope:"countries"`で国が0件の入力を渡すとバリデーションエラーになることで完了とする
  - _Requirements: 2.2, 3.2, 5.1, 5.2, 5.3_
  - _Boundary: AnnouncementsMockApi_

- [x] 1.3 (P) ヘルプデスクお知らせ管理の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に、一覧・作成・編集画面用の翻訳キーを新規名前空間（`helpdeskAnnouncements`）として追加する
  - `helpdeskNav`名前空間に「お知らせ管理」のキーを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 8.1, 8.2_
  - _Boundary: i18n messages_

---

- [x] 2. 基盤: モックAPI拡張とServer Actions
- [x] 2.1 申請者側読み取り関数へ自社国スコープフィルタを適用し、ヘルプデスク向け取得関数を追加する
  - `getAnnouncements`・`getRecentAnnouncements`・`getAnnouncementById`を、`targeting.scope === "all"`または対象国に自社の国が含まれるお知らせのみを返すよう変更する（引数・戻り値の型シグネチャは変更しない）
  - 絞り込みを行わない`getAllAnnouncements()`・`getAnnouncementByIdForHelpdesk(id)`を新設する
  - `getAnnouncements()`が自社国を含むお知らせのみを返し、`getAllAnnouncements()`が全件を返すことで完了とする
  - _Requirements: 1.1, 6.1, 6.2_
  - _Boundary: AnnouncementsMockApi_
  - _Depends: 1.1_

- [x] 2.2 お知らせのCRUDミューテーション関数を実装する
  - `lib/api/announcements.ts`に`createAnnouncement(input)`・`updateAnnouncement(id, input)`・`deleteAnnouncement(id)`を追加し、`getGlobalMockStore`で保持する配列を直接更新する
  - `createAnnouncement`は保存時刻を`publishedAt`として採番する
  - 作成・更新・削除がそれぞれ対象のお知らせのみを操作し、他のレコードに影響しないことで完了とする
  - _Requirements: 2.3, 2.4, 3.3, 4.2_
  - _Boundary: AnnouncementsMockApi_
  - _Depends: 2.1_

- [x] 2.3 お知らせの作成・編集・削除のServer Actionsを実装する
  - `lib/actions/announcements.ts`に`"use server"`を付与し、`createAnnouncementAction`・`updateAnnouncementAction`・`deleteAnnouncementAction`を実装する
  - `createAnnouncementAction`・`updateAnnouncementAction`は`announcementFormSchema`でサーバー側バリデーションを行い、不正な入力は保存せず例外を送出する
  - 各アクションの最後に、ヘルプデスク側一覧・申請者側一覧・詳細・ダッシュボードルートを`revalidatePath`で再検証する
  - 作成後にヘルプデスク側一覧と、対象国が一致する場合は申請者側一覧の両方に新しいお知らせが反映されることで完了とする
  - _Requirements: 2.3, 3.3, 4.2, 5.3_
  - _Boundary: AnnouncementActions_
  - _Depends: 1.2, 2.2_

---

- [x] 3. コア: お知らせ管理画面
- [x] 3.1 AnnouncementManagementListを実装する
  - `getAllAnnouncements()`を呼び出し、公開日降順で一覧表示する
  - ローディング中はスケルトンUI、取得失敗時はエラーメッセージ、0件時は空状態メッセージを表示する
  - 一覧の各項目にタイトル・種別・公開日・配信対象（全体一律または対象国名）を表示し、新規作成画面・各お知らせの編集画面への導線を表示する
  - 一覧に登録済みの全お知らせが表示されることで完了とする
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: AnnouncementManagementList_

- [x] 3.2 (P) DeleteAnnouncementButtonを実装する
  - クリック時にブラウザ標準の`confirm()`で確認し、確認後に`deleteAnnouncementAction`を呼び出すボタンを実装する
  - 確認をキャンセルした場合は削除アクションを呼び出さないことで完了とする
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: DeleteAnnouncementButton_
  - _Depends: 2.3_

- [x] 3.3 (P) AnnouncementFormを実装する
  - タイトル・本文・種別の入力欄に加え、配信対象を「全体一律」または「特定の国・地域を指定」から選択し、後者の場合は複数の国を選択できるUIを`react-hook-form`+`zod`（`lib/validation/announcement.ts`）で実装する
  - 新規作成時は`createAnnouncementAction`、編集時は`updateAnnouncementAction`を呼び出し、新規作成・編集の両方で共用する
  - 必須項目が未入力、または配信対象を「特定の国・地域を指定」にしたまま国を0件選択の状態で送信すると送信がブロックされ、正しく入力すると保存されることで完了とする
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 5.1, 5.2, 5.3_
  - _Boundary: AnnouncementForm_
  - _Depends: 1.2, 2.3_

- [x] 3.4 お知らせ管理一覧ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/announcements/page.tsx`を新設し、`AnnouncementManagementList`・`DeleteAnnouncementButton`を結線する
  - `/[locale]/helpdesk/announcements`にアクセスすると全件のお知らせ一覧と削除・編集導線が表示されることで完了とする
  - _Requirements: 1.1, 9.1_
  - _Boundary: AnnouncementManagementList_
  - _Depends: 3.1, 3.2_

- [x] 3.5 (P) お知らせ新規作成ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/announcements/new/page.tsx`を新設し、`AnnouncementForm`を新規作成モードで結線する
  - 新規作成に成功すると、お知らせ管理一覧に新しいお知らせが反映されることで完了とする
  - _Requirements: 2.1, 2.3, 2.4, 9.1_
  - _Boundary: AnnouncementForm_
  - _Depends: 3.3_

- [x] 3.6 (P) お知らせ編集ルートを実装し画面を結線する
  - `app/[locale]/helpdesk/announcements/[id]/edit/page.tsx`を新設し、`getAnnouncementByIdForHelpdesk`で取得した既存内容を初期値として`AnnouncementForm`を編集モードで結線し、`DeleteAnnouncementButton`も配置する
  - 存在しないIDの場合は見つからない旨のメッセージと一覧へ戻るリンクを表示する
  - 既存のお知らせを編集して保存すると、変更内容がお知らせ管理一覧・申請者側の表示に反映されることで完了とする
  - _Requirements: 3.1, 3.3, 3.4, 4.1, 9.1_
  - _Boundary: AnnouncementForm, DeleteAnnouncementButton_
  - _Depends: 3.3, 3.2_

---

- [x] 4. 統合: ナビゲーションへの統合
- [x] 4.1 HelpdeskSidebarへナビゲーション項目を追加する
  - `HELPDESK_NAV_ITEMS`に「お知らせ管理」（`/helpdesk/announcements`）の項目を追加する
  - 既存項目と同様に、現在表示中のページに対応する項目がアクティブ状態で強調表示されることで完了とする
  - _Requirements: 7.1, 7.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 3.4_

---

- [x] 5. 検証: 単体テスト・統合確認・多言語/レスポンシブ確認
- [x] 5.1 (P) 自社国スコープフィルタの単体テストを実装する
  - `getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`が、`scope:"all"`または自社国を含むお知らせのみを返すことを検証するテストを実装する
  - `getAllAnnouncements`が絞り込みなしで全件を返すことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 6.1, 6.2, 6.3_
  - _Depends: 2.1_

- [x] 5.2 (P) CRUDミューテーションの単体テストを実装する
  - `createAnnouncement`/`updateAnnouncement`/`deleteAnnouncement`が対象のお知らせのみを操作することを検証するテストを実装する
  - 存在しないIDに対する`updateAnnouncement`/`deleteAnnouncement`がエラーになることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 2.4, 3.3, 4.2_
  - _Depends: 2.2_

- [x] 5.3 (P) バリデーションスキーマとServer Actionsの単体テストを実装する
  - `announcementFormSchema`が必須項目未入力・配信対象0件選択を拒否することを検証するテストを実装する
  - Server Actionsに不正な入力を渡すと例外になり、ストアが変更されないことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 2.2, 3.2, 5.3_
  - _Depends: 1.2, 2.3_

- [x] 5.4 (P) 作成したお知らせが申請者側に反映されることを確認する
  - ヘルプデスク側で「全体一律」のお知らせを作成した後、申請者側の一覧・ダッシュボードウィジェットに表示されることを確認する
  - 自社の国を含む「特定の国・地域を指定」のお知らせを作成した場合も同様に表示されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 6.1_
  - _Depends: 3.5_

- [x] 5.5 (P) 配信対象外のお知らせが申請者側に表示されないことを確認する
  - 自社の国を含まない「特定の国・地域を指定」のお知らせを作成した後、申請者側の一覧・ダッシュボードウィジェットに表示されないことを確認する
  - 当該お知らせのIDへ直接アクセスすると見つからない旨のメッセージが表示されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 6.1, 6.2_
  - _Depends: 3.5_

- [x] 5.6 (P) 削除がヘルプデスク側・申請者側の両方に反映されることを確認する
  - お知らせを削除した後、ヘルプデスク側一覧・申請者側一覧の両方から除去されていることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 4.2_
  - _Depends: 3.6_

- [x] 5.7 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで一覧・作成・編集画面の文言が正しく切り替わることを確認する
  - タブレット幅（768px）で新規画面が横スクロールを起こさないことを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 8.1, 8.2, 9.1_
  - _Depends: 3.4, 3.5, 3.6_
