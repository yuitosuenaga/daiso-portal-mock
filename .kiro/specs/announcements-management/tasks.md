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

---

## 追加ラウンド（2026-07-07）: タイトル・種別・対応要否による検索、対応要否フィールドの追加

- [x] 6. 基盤: 対応要否フィールドと翻訳キーの追加
- [x] 6.1 `Announcement`型・バリデーション・シードデータへ対応要否を追加する
  - `Announcement`型に対応要否を表す真偽値フィールド（`actionRequired`）を必須として追加する
  - お知らせフォームのバリデーションスキーマに`actionRequired`（真偽値）を追加する
  - 既存の全シードデータ（お知らせ）に`actionRequired`の値を付与する（内容に応じて要対応/対応不要を設定）
  - 型チェック・既存テストがパスし、シードデータ全件が`actionRequired`を持つことで完了とする
  - _Requirements: 10.1_
  - _Boundary: AnnouncementsMockApi, 型定義, バリデーション_

- [x] 6.2 (P) 検索・対応要否バッジ・フォーム用の翻訳キーを追加する
  - `helpdeskAnnouncements`名前空間に、検索欄・種別絞り込み・対応要否絞り込み・クリア操作・0件時メッセージのラベル、対応要否バッジ文言、フォームの対応要否入力ラベル（要対応/対応不要の選択肢を含む）を追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 11.1, 11.6, 11.7, 10.2, 10.4_
  - _Boundary: i18n messages_

---

- [x] 7. コア: 検索フィルタと対応要否の設定・表示
- [x] 7.1 お知らせ管理一覧のフィルタ関数を実装する
  - キーワード（タイトル部分一致・大小文字無視）・種別・対応要否のAND条件でお知らせ配列を絞り込む純粋関数と、そのフィルタ条件型を実装する
  - 各条件が未指定のときはその条件で絞り込まず、全条件が空のとき入力配列をそのまま（順序を維持して）返すことで完了とする
  - _Requirements: 11.2, 11.3, 11.4, 11.8_
  - _Boundary: filterAnnouncementsForHelpdesk_
  - _Depends: 6.1_

- [x] 7.2 (P) 対応要否の入力をお知らせフォームに追加する
  - 種別入力欄の直後に、対応要否（要対応/対応不要）を選択する入力を追加する。新規作成時の初期値は「対応不要」とする
  - 対応要否を設定して保存すると、その値がお知らせデータに保存されることで完了とする
  - _Requirements: 10.2, 10.3, 10.5_
  - _Boundary: AnnouncementForm_
  - _Depends: 6.1, 6.2_

- [x] 7.3 検索フィルタUIとクライアント側一覧を実装し管理一覧に結線する
  - キーワード・種別・対応要否の絞り込み入力を受け付け変更を通知するフィルタバーと、フィルタ状態を保持して絞り込み済み一覧を描画するクライアントコンポーネントを実装する（`helpdesk-inquiry-management`のフィルタパターンを踏襲）
  - 既存の`AnnouncementManagementList`をデータ取得専用のサーバーコンポーネントに整理し、一覧描画をクライアントコンポーネントへ委譲する。各項目には対応要否が「要対応」の場合のみバッジを表示する
  - クリア操作で全条件を解除できる。絞り込み結果が0件のとき「該当するお知らせがありません」を表示し、絞り込み後も公開日降順を維持する
  - ブラウザで管理一覧を開き、キーワード・種別・対応要否で絞り込むと一覧が即時に絞り込まれ、要対応のお知らせにバッジが表示されることで完了とする
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 10.4_
  - _Boundary: AnnouncementFilterBar, AnnouncementManagementListClient, AnnouncementManagementList_
  - _Depends: 7.1, 6.2_

---

- [ ] 8. 検証: 単体テスト・統合/多言語/レスポンシブ確認
- [x] 8.1 (P) フィルタ関数とバリデーションの単体テストを実装する
  - フィルタ関数がキーワード（部分一致・大小文字無視）・種別・対応要否のAND条件で絞り込むこと、全条件が空のとき全件を返すことを検証するテストを実装する
  - バリデーションスキーマが`actionRequired`を真偽値として要求することを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 11.2, 11.3, 11.4, 11.8, 10.1_
  - _Depends: 7.1, 6.1_

- [ ]* 8.2 (P) 管理一覧の検索・対応要否表示の統合テストを実装する
  - キーワード・種別・対応要否を入力すると一覧が絞り込まれ、クリアで全件表示に戻ること、0件時にメッセージが表示されることを検証するテストを実装する
  - 対応要否が「要対応」のお知らせにのみバッジが出力されることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 11.1, 11.5, 11.6, 11.7, 10.4_
  - _Depends: 7.3_

- [x] 8.3 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールでフィルタバーのラベル・対応要否バッジ・フォームの対応要否入力の文言が正しく切り替わることを確認する
  - タブレット幅（768px）でフィルタバーが横スクロールを起こさないことを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 11.1, 10.4_
  - _Depends: 7.2, 7.3_

---

## 追加ラウンド（2026-07-08）: 確認済み・実施済み人数の可視化と未対応者へのリマインド

- [x] 9. 基盤: 担当者マスタ・型・Dialogプリミティブ・翻訳キー
- [x] 9.1 担当者マスタの型定義・モックデータを追加する
  - `AnnouncementRecipient`（`id`・`companyCode`・`companyName`・`country`・`contactName`）・`AnnouncementRecipientStatus`（`announcementId`・`recipientId`・`confirmedAt`・`completedAt`・`reminderSentAt`）型を定義する
  - `DOCUMENT_COMPANY_OPTIONS`の各社について担当者を2名ずつ、計16名のモックデータを定数として追加する
  - 型チェックがパスし、担当者マスタが16件（各社2名）であることで完了とする
  - _Requirements: 12.1, 12.2_
  - _Boundary: AnnouncementRecipient型, 担当者マスタ定数_

- [x] 9.2 (P) `Dialog`UIプリミティブを追加する
  - `@radix-ui/react-dialog`を依存に追加し、既存の`accordion.tsx`と同様のパターンでshadcn/uiスタイルの`Dialog`ラッパー（`Dialog`・`DialogContent`・`DialogHeader`・`DialogTitle`）を実装する
  - ダイアログを開閉でき、内容が正しく表示されることで完了とする
  - _Boundary: components/ui/dialog.tsx_

- [x] 9.3 (P) 確認済み・実施済み表示、未対応者一覧、リマインド関連の翻訳キーを追加する
  - `helpdeskAnnouncements.tracking`名前空間に、確認済み/実施済み人数表示・ダイアログのタイトル・個別/一括リマインドボタン・送信完了メッセージ・送信済み表示のラベルを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 13.5, 14.6_
  - _Boundary: i18n messages_

---

- [x] 10. コア: 確認済み・実施済み集計とリマインド送信のモックAPI
- [x] 10.1 確認済み・実施済み集計、未対応者一覧、自社宛リマインド有無判定のモックAPIを実装する
  - お知らせの`targeting`（全体一律 or 特定国）に応じて対象担当者を算出し、確認済み・実施済み（`actionRequired`が偽のときは`null`）の件数を返す関数を実装する
  - お知らせIDから、担当者情報とステータスを結合した一覧を返す関数を実装する
  - 指定した会社コードについて、未対応（`completedAt`が`null`）のまま`reminderSentAt`が設定されている担当者が存在するかを判定する関数を実装する
  - 初期シードデータとして、`MOCK_CURRENT_COMPANY`（VN）に属する担当者について、`actionRequired: true`の既存お知らせ1件に対し`reminderSentAt`設定済み・`completedAt`が`null`の状態を含める
  - 集計値が対象担当者数と一致し、自社宛リマインド有無判定が期待どおりの真偽値を返すことで完了とする
  - _Requirements: 12.3, 12.4, 13.1, 13.2, 13.3, 13.4_
  - _Boundary: AnnouncementTrackingMockApi_
  - _Depends: 9.1_

- [x] 10.2 リマインド送信のServer Actionsを実装する
  - `"use server"`を付与し、指定した担当者ID配列について`reminderSentAt`を現在時刻で更新するアクションを実装する
  - 処理後、ヘルプデスク側お知らせ一覧・申請者側一覧・詳細ルートを`revalidatePath`で再検証する
  - 空配列を渡した場合は何もせず正常終了することで完了とする
  - _Requirements: 14.4, 14.5_
  - _Boundary: AnnouncementTrackingActions_
  - _Depends: 10.1_

---

- [x] 11. コア: 人数表示・未対応者ダイアログ・一覧統合
- [x] 11.1 確認済み・実施済み人数バッジを実装する
  - お知らせと担当者ステータス一覧を受け取り、「確認済み X/Y人」を表示し、`actionRequired`が真のときのみ「実施済み X/Y人」を併記するコンポーネントを実装する
  - クリックすると対象状態（確認済み or 実施済み）を指定してダイアログを開くことで完了とする
  - _Requirements: 13.1, 13.2, 13.3_
  - _Boundary: AnnouncementTrackingBadge_
  - _Depends: 9.3_

- [x] 11.2 未対応者一覧ダイアログと個別・一括リマインド送信を実装する
  - `Dialog`プリミティブを用い、未対応の担当者（氏名・所属会社・国・送信済み状態）を一覧表示する
  - 各行に個別リマインドボタン、一覧上部に一括リマインドボタンを配置し、送信後は成功メッセージ（`Alert`の`success`バリアント）を表示し、送信済みの担当者には送信済みである旨を表示する
  - ブラウザでダイアログを開き、個別・一括それぞれでリマインドを送信すると完了メッセージと送信済み表示が更新されることで完了とする
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - _Boundary: AnnouncementRecipientDialog_
  - _Depends: 10.2, 9.2, 9.3_

- [x] 11.3 お知らせ管理一覧に人数表示を結線する
  - `AnnouncementManagementList`（サーバー）が各お知らせについて担当者ステータス一覧を取得し、`AnnouncementManagementListClient`経由で各行に`AnnouncementTrackingBadge`を表示する
  - ブラウザで管理一覧を開くと各行に確認済み・実施済み人数が表示され、クリックで未対応者一覧が確認できることで完了とする
  - _Requirements: 13.1, 13.4_
  - _Boundary: AnnouncementManagementList, AnnouncementManagementListClient_
  - _Depends: 11.1, 11.2, 10.1_

---

- [ ] 12. 検証: 単体テスト・統合/多言語/レスポンシブ確認
- [x] 12.1 (P) 集計・自社宛リマインド有無判定の単体テストを実装する
  - `targeting.scope`に応じた対象担当者数の算出、`actionRequired`が偽のときに実施済み件数が`null`になること、自社宛リマインド有無判定が期待どおりの真偽値を返すことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 12.3, 12.4, 13.2, 13.3_
  - _Depends: 10.1_

- [ ]* 12.2 (P) リマインド送信・ダイアログ表示の統合テストを実装する
  - リマインド送信後に対象担当者のみ状態が更新され、他の担当者・他のお知らせに影響しないことを検証するテストを実装する
  - 確認済み人数クリックで未確認の担当者のみがダイアログに表示されることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 14.1, 14.4, 14.5_
  - _Depends: 11.2, 11.3_

- [ ] 12.3 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで人数表示・ダイアログ内文言が正しく切り替わることを確認する
  - タブレット幅（768px）でダイアログが横スクロールを起こさずに表示されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 13.5, 14.6_
  - _Depends: 11.2, 11.3_

---

## 追加ラウンド（2026-07-08）: 公開期間・対応期限の設定

- [x] 13. 基盤: 型・バリデーション・翻訳キーの追加
- [x] 13.1 `Announcement`型に公開期間・対応期限フィールドを追加する
  - `Announcement`に`publishStartDate: string | null`, `publishEndDate: string | null`, `dueDate: string | null`（いずれもISO日付文字列）を追加する
  - 既存シードデータ（`MOCK_ANNOUNCEMENTS`）の各件に、`null`または動作確認用の具体値（公開期間設定済み1件、対応期限設定済み1件を含める）を設定する
  - 型チェックがパスすることで完了とする
  - _Requirements: 15.4, 17.1_
  - _Boundary: Announcement型_

- [x] 13.2 (P) バリデーションスキーマに公開期間・対応期限の検証を追加する
  - `announcementFormSchema`に`publishStartDate`/`publishEndDate`/`dueDate`（空文字は`null`に変換）を追加する
  - `superRefine`で「終了日が開始日より前のとき`publishEndDate`にエラー」「`actionRequired`が真かつ`dueDate`未入力のとき`dueDate`にエラー」を検証する
  - 上記2条件のバリデーションが期待どおりエラーを返すことで完了とする
  - _Requirements: 15.3, 17.2, 17.3_
  - _Boundary: announcementFormSchema_
  - _Depends: 13.1_

- [x] 13.3 (P) 公開期間・対応期限の翻訳キーを追加する
  - `helpdeskAnnouncements`名前空間に、公開期間（開始日・終了日）・対応期限の入力ラベル・バリデーションメッセージ・一覧表示ラベル・常時公開である旨のラベルを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 15.1, 16.4, 17.2, 17.6_
  - _Boundary: i18n messages_

---

- [x] 14. コア: モックAPI・フォーム・一覧表示
- [x] 14.1 モックAPIに公開期間による可視性判定を実装し、更新処理の欠落フィールドを修正する
  - `isVisibleToCurrentCompany`相当の判定に、公開期間（未設定なら常に`true`、設定時は現在日時が範囲内かどうか）を合成する`isWithinPublishPeriod`を実装し、`getAnnouncements`/`getRecentAnnouncements`/`getAnnouncementById`に適用する
  - `getAllAnnouncements`/`getAnnouncementByIdForHelpdesk`は公開期間に関わらず全件を返すことを確認する（変更不要）
  - `updateAnnouncement`が`publishStartDate`/`publishEndDate`/`dueDate`に加え、既存の`actionRequired`（現状更新されていない）も含め、渡された全フィールドを更新するよう修正する
  - `createAnnouncement`が新規3フィールドを保存することを確認する
  - 公開期間外のお知らせが申請者側取得関数から除外され、ヘルプデスク向け取得関数では除外されないことで完了とする
  - _Requirements: 16.1, 16.2, 16.3_
  - _Boundary: AnnouncementsMockApi_
  - _Depends: 13.1_

- [x] 14.2 (P) AnnouncementFormに公開期間・対応期限の入力欄を追加する
  - 公開期間の開始日・終了日（`<input type="date">`、任意入力）を追加する
  - 対応期限（`<input type="date">`）を追加し、`actionRequired`を`watch`して真のときのみ活性化・必須表示にする
  - `actionRequired`が偽に変更されたとき、対応期限の値をクリアする
  - ブラウザで対応要否を切り替えると対応期限欄の活性化・必須表示・クリアが期待どおり動作することで完了とする
  - _Requirements: 15.1, 15.2, 17.2, 17.4, 17.5_
  - _Boundary: AnnouncementForm_
  - _Depends: 13.2, 13.3_

- [x] 14.3 AnnouncementManagementListClientに公開期間・対応期限の表示を追加する
  - 各行のメタ情報に、公開期間が設定されている場合はその期間を、未設定の場合は常時公開である旨を表示する
  - `actionRequired`が真の行にのみ対応期限を表示する
  - ブラウザで管理一覧を開き、公開期間・対応期限が期待どおり表示されることで完了とする
  - _Requirements: 15.5, 16.4, 17.6_
  - _Boundary: AnnouncementManagementListClient_
  - _Depends: 13.1, 13.3_

---

- [x] 15. 検証: 単体テスト・統合/多言語確認
- [x] 15.1 (P) 公開期間判定・バリデーションの単体テストを実装する
  - 開始前・終了後・期間内・未設定の4パターンで可視性判定が正しく判定されることを検証するテストを実装する
  - `announcementFormSchema`が終了日<開始日、および`actionRequired: true`かつ`dueDate`未入力のケースをそれぞれ拒否することを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 15.3, 16.1, 16.2, 17.2, 17.3_
  - _Depends: 13.2, 14.1_

- [x] 15.2 (P) 更新処理・全件取得の単体テストを実装する
  - `updateAnnouncement`が`actionRequired`・公開期間・対応期限を含む全フィールドを更新し、他のお知らせに影響しないことを検証するテストを実装する
  - `getAllAnnouncements`/`getAnnouncementByIdForHelpdesk`が公開期間に関わらず全件・該当データを返すことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 16.3_
  - _Depends: 14.1_

- [x]* 15.3 (P) フォームの必須化・クリア動作の統合テストを実装する
  - 対応要否を「対応が必要」にした状態で対応期限未入力のまま保存しようとすると保存がブロックされることを検証するテストを実装する
  - 対応要否を「対応不要」に変更すると対応期限欄がクリアされることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 17.3, 17.5_
  - _Depends: 14.2_

- [x] 15.4 (P) 多言語表示を確認する
  - 日本語・英語両ロケールで公開期間・対応期限の入力欄・一覧表示・バリデーションメッセージが正しく切り替わることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 15.1, 17.6_
  - _Depends: 14.2, 14.3_

---

## 追加ラウンド（2026-07-10）: 下書き機能の追加

- [x] 16. 基盤: スキーマ・型・バリデーション・翻訳キーの追加
- [x] 16.1 Prismaスキーマに公開状態・作成日時・更新日時を追加する
  - `AnnouncementStatus`列挙型（`draft`/`published`）を追加し、`Announcement`に`status AnnouncementStatus @default(published)`、`createdAt DateTime @default(now())`、`updatedAt DateTime @updatedAt`を追加する
  - `publishedAt`を`DateTime?`（nullable）に変更する
  - 上記変更を反映するマイグレーションを作成し、既存行が`status: published`として移行されることを確認する
  - `npx prisma migrate dev`が成功し、既存のシードデータ・テストが引き続き通ることで完了とする
  - _Requirements: 18.1, 19.1_
  - _Boundary: prisma/schema.prisma_

- [x] 16.2 (P) `Announcement`型・`CreateAnnouncementInput`を更新する
  - `AnnouncementStatus`型（`"draft" | "published"`）、`Announcement.status`、`Announcement.createdAt`/`updatedAt: string`を追加する
  - `Announcement.publishedAt`を`string | null`に変更する
  - 型チェックがパスすることで完了とする
  - _Requirements: 18.1_
  - _Boundary: types/announcement.ts_
  - _Depends: 16.1_

- [x] 16.3 (P) バリデーションスキーマに公開状態を追加する
  - `announcementFormSchema`に`status: z.enum(["draft", "published"])`を追加する
  - 不正な値（`"draft"`/`"published"`以外）が拒否されることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 18.1_
  - _Boundary: lib/validation/announcement.ts_
  - _Depends: 16.2_

- [x] 16.4 (P) 公開状態関連の翻訳キーを追加する
  - `helpdeskAnnouncements`名前空間に、公開状態セレクトのラベル・選択肢（下書き/公開）、一覧の下書きバッジ、絞り込みのラベル・選択肢を追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 18.2, 21.1, 21.2_
  - _Boundary: i18n messages_

---

- [x] 17. コア: サービス層（可視性ゲート・公開日時打刻・並び順）の実装
- [x] 17.1 申請者側の可視性判定に公開状態フィルタを追加する
  - `visibleToCountryWhere`（`src/lib/server/announcement-service.ts`）に`status: "published"`を配信対象条件とのAND条件として追加する
  - `listAnnouncementsVisibleToCountry`/`findAnnouncementVisibleToCountry`が、公開期間・配信対象の条件を満たしていても`status: "draft"`のお知らせを返さないことで完了とする
  - _Requirements: 20.1, 20.2, 20.3_
  - _Boundary: announcement-service.ts_
  - _Depends: 16.1, 16.2_

- [x] 17.2 公開日時の記録タイミングを実装する
  - `createAnnouncementRecord`が`status: "draft"`のとき`publishedAt: null`、`status: "published"`のとき`publishedAt`に保存時刻を設定するよう修正する
  - `updateAnnouncementRecord`が更新前のレコードを取得し、`status`が「`draft`→`published`」に変わったときのみ`publishedAt`を保存時刻で上書きし、それ以外（`published`のまま、または`published`→`draft`）では既存の`publishedAt`を変更しないよう修正する
  - 上記3パターン（新規下書き作成・下書き→公開・公開のまま更新）が期待どおり`publishedAt`を扱うことで完了とする
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  - _Boundary: announcement-service.ts_
  - _Depends: 16.1, 16.2_

- [x] 17.3 (P) ヘルプデスク側一覧の並び順を作成日時基準に変更する
  - `listAllAnnouncements`の`orderBy`を`publishedAt desc`から`createdAt desc`に変更する（下書きは`publishedAt`が`null`になり得るため）
  - 下書き・公開が混在する一覧が、公開状態に関わらず作成日時の降順で表示されることで完了とする
  - _Requirements: 20.4_
  - _Boundary: announcement-service.ts_
  - _Depends: 16.1_

---

- [x] 18. コア: フォーム・一覧・フィルタ・リマインド抑止への結線
- [x] 18.1 `AnnouncementForm`に公開状態セレクトを追加する
  - 公開状態（下書き/公開）を選択する`Select`フィールドを追加し、新規作成時の初期値を「下書き」とする
  - 編集時は既存レコードの`status`を初期表示し、変更して保存すると選択した値がそのまま送信されることをブラウザで確認する
  - _Requirements: 18.2, 18.3, 18.4, 18.5_
  - _Boundary: AnnouncementForm_
  - _Depends: 16.3, 16.4_

- [x] 18.2 (P) `AnnouncementManagementListClient`に下書きバッジと公開日フォールバック表示を追加する
  - `status === "draft"`の行にのみ下書きバッジを表示する
  - `publishedAt`が`null`の行では、公開日表示をプレースホルダー（例: `—`）に置き換え、例外が発生しないようにする
  - ブラウザで管理一覧を開き、下書き・公開の行が正しく見分けられることで完了とする
  - _Requirements: 21.1, 21.3_
  - _Boundary: AnnouncementManagementListClient_
  - _Depends: 16.2, 16.4_

- [x] 18.3 (P) 公開状態による絞り込みを追加する
  - `HelpdeskAnnouncementFilters`に`status: "" | "draft" | "published"`を追加し、`filterAnnouncementsForHelpdesk`が既存の条件とのAND条件で絞り込むようにする
  - `AnnouncementFilterBar`に公開状態（すべて/下書き/公開）の`Select`を追加する
  - ブラウザで公開状態の絞り込みを操作し、一覧が期待どおり絞り込まれることで完了とする
  - _Requirements: 21.2_
  - _Boundary: helpdesk-announcement-list.ts, AnnouncementFilterBar_
  - _Depends: 16.4_

- [x] 18.4 (P) 下書き状態でのリマインド送信・確認済み人数表示を抑止する
  - `AnnouncementTrackingBadge`・`AnnouncementRecipientDialog`について、対象のお知らせが`status === "draft"`のときは人数表示・未対応者一覧・リマインド送信操作を提供しない（非表示または無効化）
  - ブラウザで下書き状態のお知らせの管理一覧行を確認し、確認済み人数表示・リマインド操作が現れないことで完了とする
  - _Requirements: 22.1_
  - _Boundary: AnnouncementTrackingBadge, AnnouncementRecipientDialog_
  - _Depends: 16.2, 18.2_

---

- [ ] 19. 検証: 単体テスト・統合/多言語確認
- [x] 19.1 (P) サービス層（可視性ゲート・公開日時打刻・並び順）の単体テストを実装する
  - `listAnnouncementsVisibleToCountry`/`findAnnouncementVisibleToCountry`が`status: "draft"`のお知らせを配信対象・公開期間の条件に関わらず除外することを検証するテストを実装する
  - `createAnnouncementRecord`/`updateAnnouncementRecord`が公開日時打刻の3パターン（新規下書き・下書き→公開・公開のまま更新）を正しく扱うことを検証するテストを実装する
  - `listAllAnnouncements`が`createdAt`降順で全件（下書き含む）を返すことを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 20.2, 20.3, 20.4_
  - _Depends: 17.1, 17.2, 17.3_

- [x] 19.2 (P) フィルタ・フォームバリデーションの単体テストを実装する
  - `filterAnnouncementsForHelpdesk`が公開状態によるAND条件の絞り込みに対応することを検証するテストを実装する
  - `announcementFormSchema`が`status`を`"draft" | "published"`のいずれかとして要求することを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 21.2_
  - _Depends: 16.3, 18.3_

- [ ]* 19.3 (P) 下書き→公開の可視性遷移の統合テストを実装する
  - 下書きとして新規作成したお知らせが申請者側の一覧・詳細・ダッシュボードウィジェットに表示されないこと、編集で「公開」に変更すると表示されるようになることを検証するテストを実装する
  - 公開済みのお知らせを「下書き」に差し戻すと、即座に申請者側の表示から除外されることを検証するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 20.1, 20.2, 20.3_
  - _Depends: 17.1, 18.1_

- [ ] 19.4 (P) 多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで公開状態セレクト・下書きバッジ・絞り込みラベルが正しく切り替わることを確認する
  - タブレット幅（768px）でフォーム・一覧が横スクロールを発生させないことを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 18.2, 21.1, 21.2_
  - _Depends: 18.1, 18.2, 18.3_

---

## 追加ラウンド（2026-07-13）: 会社単位の自己申告記録機能

- [ ] 20. 基盤: 自己申告状態の型定義
- [ ] 20.1 会社単位の確認済み・実施済み状態を表す型を追加する
  - 確認済み日時・実施済み日時（いずれも`string | null`）を持つ`AnnouncementSelfStatus`型を追加する
  - 型チェックがパスすることで完了とする
  - _Requirements: 23.1, 23.2_
  - _Boundary: types/announcement-recipient.ts_

- [ ] 21. コア: 会社単位の記録・読み取りサービス関数の実装
- [ ] 21.1 会社単位の確認済み記録関数を実装する
  - 指定した会社かつ配信対象に含まれる担当者全員について、確認済み日時が未記録のものにのみ現在時刻を記録する
  - 既に確認済みの担当者の記録時刻は上書きしない
  - 対象お知らせの配信対象に指定会社が含まれない場合、対象0件で何も記録しないことで完了とする
  - _Requirements: 23.1, 23.6_
  - _Boundary: announcement-service.ts_

- [ ] 21.2 会社単位の実施済み記録関数を実装する
  - 対応要否が真のお知らせについてのみ、指定した会社かつ配信対象に含まれる担当者全員の実施済み日時を記録する
  - 対応要否が偽のお知らせに対しては何も記録しないことで完了とする
  - 既に実施済みの担当者の記録時刻は上書きしない
  - _Requirements: 23.2, 23.6_
  - _Boundary: announcement-service.ts_
  - _Depends: 21.1_

- [ ] 21.3 会社単位の自己申告状態を読み取る関数を実装する
  - 指定した会社かつ配信対象に含まれる担当者全員が確認済み（または実施済み）のときのみ、対応する日時を返す
  - 1人でも未記録の担当者がいる場合は`null`を返すことで完了とする
  - _Requirements: 23.5_
  - _Boundary: announcement-service.ts_
  - _Depends: 21.1, 21.2_

- [ ] 22. コア: 申請者セッションでラップするAPI層関数の実装
- [ ] 22.1 会社単位の確認済み・実施済み記録をセッション経由で受け付けるAPI関数を実装する
  - 申請者セッションのクレームから会社コード・国を取得し、クライアント入力の会社コードは受け取らない
  - 対象お知らせが下書き・配信対象外・公開期間外・存在しないいずれかに該当する場合は既存の可視性判定関数を用いて何も記録せず正常終了する
  - 対応完了の記録は、対応要否が偽のお知らせに対しては何も記録せず正常終了することで完了とする
  - 下書き状態のお知らせIDを指定して呼び出しても記録が行われないことを確認できることで完了とする
  - _Requirements: 23.3, 23.4_
  - _Boundary: lib/api/announcement-tracking.ts_
  - _Depends: 21.1, 21.2_

- [ ] 22.2 自社の自己申告状態を取得するAPI関数を実装する
  - 申請者セッションから会社コードを取得し、会社単位の読み取り関数の結果を返す
  - _Requirements: 23.5_
  - _Boundary: lib/api/announcement-tracking.ts_
  - _Depends: 21.3_

- [ ] 23. 統合: Server Actionsの実装と関連ルートの再検証
- [ ] 23.1 確認済み・対応完了を記録するServer Actionsを実装する
  - `"use server"`を付与し、API層の記録関数を呼び出した後、既存のリマインド送信アクションと同一の対象ルート（ヘルプデスク側一覧・申請者側一覧・詳細）を`revalidatePath`で再検証する
  - 呼び出し元へ最新の自己申告状態を返す
  - アクション実行後、ヘルプデスク側お知らせ管理一覧の確認済み人数表示が次回アクセス時に増えていることをブラウザで確認できることで完了とする
  - _Requirements: 23.1, 23.2, 23.5_
  - _Boundary: lib/actions/announcement-tracking.ts_
  - _Depends: 22.1, 22.2_

- [ ] 24. 検証: 単体テスト・統合確認
- [ ] 24.1 (P) 会社単位の記録関数の単体テストを実装する
  - 指定会社・配信対象に含まれる担当者のみが更新され、他社・他のお知らせに影響しないことを検証する
  - 既に記録済みの担当者について、再実行しても記録時刻が変わらないことを検証する
  - 対応要否が偽のお知らせに対する実施済み記録が何も行わないことを検証する
  - 全テストがパスすることで完了とする
  - _Requirements: 23.1, 23.2, 23.6_
  - _Depends: 21.1, 21.2, 21.3_

- [ ] 24.2 (P) API層の可視性ガードの単体テストを実装する
  - 下書き・配信対象外・公開期間外のお知らせに対して記録が行われないことを検証する
  - 全テストがパスすることで完了とする
  - _Requirements: 23.3, 23.4_
  - _Depends: 22.1_

- [ ] 24.3 統合テスト: 記録結果が既存の集計・未対応者一覧に反映されることを確認する
  - 会社単位の確認済み・実施済み記録後、`getAnnouncementTrackingSummary`の人数と未対応者一覧の両方に反映されることを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 23.5_
  - _Depends: 23.1_
