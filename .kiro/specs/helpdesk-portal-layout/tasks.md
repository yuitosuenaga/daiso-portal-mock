# 実装タスク: helpdesk-portal-layout

## 実装計画

- [x] 1. 基盤: ルート構造の再編とi18nキーの準備
- [x] 1.1 既存申請者側ページをルートグループへ移設し、共通レイアウトの責務を分離する
  - `[locale]/layout.tsx`からAppShellの適用を取り除き、`NextIntlClientProvider`のみを残す
  - `(applicant)/layout.tsx`を新設し、既存の`AppShell`を適用する
  - 既存の`page.tsx`・`inquiry/`・`announcements/`・`links/`・`faq/`を内容変更なしで`(applicant)/`配下へ移動する
  - 移動後に`npm run build`が成功し、`/`, `/inquiry`, `/inquiry/new`, `/inquiry/[id]`, `/announcements`, `/announcements/[id]`, `/links`, `/faq`が移動前と同一のURL・同一の見た目で表示されることで完了とする
  - _Requirements: 1.3, 4.3, 6.1, 6.2_
  - _Boundary: ApplicantLayout, AppShell_

- [x] 1.2 (P) ヘルプデスク側レイアウト・切り替えリンク用の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に、ヘルプデスクヘッダー・サイドバー・ホームページ・申請者側⇔ヘルプデスク側切り替えリンク用の翻訳キーを新規名前空間として追加する
  - 既存の`header`・`nav`名前空間の既存キーは変更しない
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 7.1, 7.2_
  - _Boundary: i18n messages_

---

- [x] 2. コア: ヘルプデスク側シェル・ページの実装
- [x] 2.1 (P) HelpdeskHeaderコンポーネントを実装する
  - ロゴ・タイトル・言語切替に加え、「ヘルプデスク」であることを示す視覚的なバッジ表示を追加する
  - 申請者側画面へ戻るための切り替えリンクを設置する
  - 全ての表示文字列を翻訳キー経由で表示し、バッジ・リンクの文言が日本語・英語で切り替わることで完了とする
  - _Requirements: 2.1, 3.1, 3.2, 4.1, 7.1, 7.2_
  - _Boundary: HelpdeskHeader_
  - _Depends: 1.2_

- [x] 2.2 (P) HelpdeskSidebarコンポーネントを実装する
  - プレースホルダーのナビゲーション項目（ホームへのリンク）を1件持つサイドバーを実装する
  - 既存Sidebarと同様の折りたたみ・レスポンシブ挙動（タブレット幅でアイコンのみ表示等）を再現する
  - ナビゲーション項目のラベルが翻訳キー経由で表示されることで完了とする
  - _Requirements: 2.2, 7.1, 7.2_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 1.2_

- [x] 2.3 HelpdeskAppShellコンポーネントを実装する
  - HelpdeskHeaderとHelpdeskSidebarを組み合わせ、固定ヘッダー・左サイドバー・残余コンテンツ領域のレイアウトを構成する
  - タブレット幅（768px以上）で横スクロールが発生しないレスポンシブ構造にする
  - ブラウザ幅768pxで表示した際にレイアウト崩れ・横スクロールが発生しないことで完了とする
  - _Requirements: 2.1, 2.2, 2.3, 8.1_
  - _Boundary: HelpdeskAppShell_
  - _Depends: 2.1, 2.2_

- [x] 2.4 helpdeskルートセグメントのレイアウトとホームページを実装する
  - `helpdesk/layout.tsx`を新設し、HelpdeskAppShellを適用する
  - `helpdesk/page.tsx`を新設し、今後追加される機能（問い合わせ管理・お知らせ管理）が別specで実装予定であることを説明するプレースホルダー画面を実装する
  - `/[locale]/helpdesk`へアクセスするとHelpdeskAppShell配下にプレースホルダーホームが表示され、申請者側のHeader/Sidebarが併存しないことで完了とする
  - _Requirements: 1.1, 1.2, 2.3, 5.1, 5.2_
  - _Boundary: HelpdeskLayout, HelpdeskHomePage_
  - _Depends: 1.1, 2.3_

- [x] 2.5 (P) 既存Headerコンポーネントにヘルプデスク側への切り替えリンクを追加する
  - 申請者側Headerの右側領域に、ヘルプデスク側ホームへ遷移するリンクを追加する
  - 既存のロゴ・タイトル・LanguageSwitcherの表示・配置は変更しない
  - 申請者側画面でリンクをクリックすると`/[locale]/helpdesk`へ遷移することで完了とする
  - _Requirements: 4.1, 4.2_
  - _Boundary: Header_
  - _Depends: 1.2_

---

- [x] 3. コア: 問い合わせデータの自社スコープ化と全社データ基盤
- [x] 3.1 (P) 自社スコープの問い合わせ取得ロジックを実装する
  - `lib/api/inquiries.ts`に固定のモック会社定数を定義する
  - `getInquiries()`の返却データを、このモック会社に紐づく問い合わせのみに絞り込む
  - モック会社に紐づく問い合わせが一覧・ダッシュボードのデモに耐える件数になるよう、必要に応じてモックデータを追加する
  - `getInquiries()`を呼び出すと指定したモック会社の問い合わせのみが返り、他社のデータが含まれないことで完了とする
  - 自社に紐づく問い合わせが0件の場合でも既存の空状態表示にそのまま到達することを確認する
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - _Boundary: InquiriesMockApi_

- [x] 3.2 `getInquiryStatusSummary`を自社データから動的に算出するよう変更する
  - 固定値を返す現在の実装をやめ、自社スコープの問い合わせ一覧からステータス別件数を集計して返すよう変更する
  - `getInquiryStatusSummary()`が返す合計件数が`getInquiries()`の件数と一致することで完了とする
  - _Requirements: 9.1_
  - _Boundary: InquiriesMockApi_
  - _Depends: 3.1_

- [x] 3.3 全社データを返す`getAllInquiries`関数を新設する
  - 絞り込みを行わず、モックデータ全件を送信日時（`createdAt`）降順で返す関数を追加する
  - 既存の`getInquiries`・`getInquiryById`・`createInquiry`の引数・戻り値の型シグネチャを変更しないことを確認する
  - `getAllInquiries()`が全社分の件数を返し、`getInquiries()`の戻り値がその部分集合になっていることで完了とする
  - _Requirements: 10.1, 10.2, 10.3_
  - _Boundary: InquiriesMockApi_
  - _Depends: 3.1_

---

- [x] 4. 検証: 回帰確認・切り替え導線・データ整合性・多言語/レスポンシブ確認
- [x] 4.1 (P) 既存申請者側ページの回帰テストを実施する
  - 移設後の`(applicant)`配下ページ（ダッシュボード・問い合わせ一覧・詳細・お知らせ一覧・詳細・リンク集・FAQ）に対する既存テストスイートを実行する
  - `npm run lint`・`npm run typecheck`・`npm run build`が全て成功することで完了とする
  - _Requirements: 6.1, 6.2_
  - _Depends: 1.1_

- [x] 4.2 (P) 申請者側⇔ヘルプデスク側の切り替え導線を検証する
  - 申請者側からヘルプデスク側、ヘルプデスク側から申請者側への遷移を実際に操作し、正しい遷移先に移動することを確認するテストを実装する
  - 認証なしでどちらの画面にも制限なくアクセスできることを確認する
  - 切り替えリンクが日本語・英語両ロケールで正しい文言で表示されることで完了とする
  - _Requirements: 4.1, 4.2, 4.3_
  - _Depends: 2.4, 2.5_

- [x] 4.3 (P) 自社データスコープ・全社データ取得のユニットテストを実装する
  - `getInquiries()`が自社データのみを返すこと、`getInquiryStatusSummary()`の集計件数が一致すること、`getAllInquiries()`が全件を返すことを検証するテストを実装する
  - 自社データが0件のケースで既存の空状態表示に到達することを確認するテストを実装する
  - 全テストがパスすることで完了とする
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3_
  - _Depends: 3.1, 3.2, 3.3_

- [x] 4.4 (P) ヘルプデスク側レイアウトの多言語表示・レスポンシブ表示を確認する
  - 日本語・英語両ロケールで`/[locale]/helpdesk`にアクセスし、ヘッダー・サイドバー・ホームページの文言が正しく切り替わることを確認する
  - タブレット幅（768px）で横スクロールが発生しないことをブラウザ幅を変更して確認する
  - 上記確認が全て問題ないことで完了とする
  - _Requirements: 7.1, 7.2, 8.1_
  - _Depends: 2.4_
