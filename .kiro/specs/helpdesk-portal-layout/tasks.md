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

---

- [x] 5. サイドバーのアクティブ判定統一・ヘッダーロゴのダッシュボード導線化（2026-07-08 追記）
- [x] 5.1 (P) 申請者側サイドバーのアクティブ判定を子ルート対応にする
  - `Sidebar.tsx`の`isActive`算出を、`HelpdeskSidebar.tsx`と同様の「完全一致、またはパス区切りを伴う前方一致」方式に統一する
  - ルート直下（`href="/"`）は完全一致のみでアクティブ判定し、常時アクティブ化を避ける
  - 観測可能な完了条件: `/documents/[id]`・`/inquiry/[id]`のような子ルートを表示中も、対応する親ナビゲーション項目がハイライトされ、ダッシュボード項目は常時アクティブ化しないことを確認できる
  - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - _Boundary: Sidebar_

- [x] 5.2 (P) 両ヘッダーのロゴ領域をダッシュボードへのリンクにする
  - `Header.tsx`の左上ロゴ・タイトル領域を`href="/"`のリンクにする
  - `HelpdeskHeader.tsx`の左上ロゴ・タイトル・バッジ領域を`href="/helpdesk"`のリンクにする
  - 既存のロゴ・タイトル・バッジ・言語切替・ポータル切り替えリンクの表示・配置は変更しない
  - 観測可能な完了条件: 両ポータルの任意のページでヘッダー左上をクリック（またはキーボード操作）すると、それぞれのダッシュボードへ遷移することを確認できる
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - _Boundary: Header, HelpdeskHeader_

---

## 追加ラウンド（2026-07-13）: ログアウト導線・HelpdeskAppShell開閉ボタンのi18n化

- [x] 6. ログアウト導線の追加とHelpdeskAppShell開閉ボタンのi18n化
- [x] 6.1 (P) ログアウト・開閉ボタンの翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に、両ヘッダーのログアウトコントロールの表示文言・アクセシブルな名前と、`HelpdeskAppShell`のサイドバー開閉ボタンの`aria-label`（展開/折りたたみの2状態）の翻訳キーを追加する
  - `ja.json`で定義した新規キーが全て`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 13.5, 14.2, 14.3_
  - _Boundary: i18n messages_

- [x] 6.2 申請者側Headerにログアウトコントロールを追加する
  - 申請者側`Header.tsx`の右側領域（`LanguageSwitcher`・ポータル切り替えリンクと同じ並び）に、ログアウトを実行するコントロールを追加する
  - クリック（およびキーボード操作）で`next-auth`の`signOut`を呼び出し、完了後にサインイン画面へ遷移する
  - 既存のロゴ・言語切替・ポータル切り替えリンクの表示・配置を変更しないことで完了とする
  - _Requirements: 13.1, 13.3, 13.4, 13.6, 13.7_
  - _Boundary: Header_
  - _Depends: 6.1_

- [x] 6.3 (P) ヘルプデスク側HelpdeskHeaderにログアウトコントロールを追加する
  - ヘルプデスク側`HelpdeskHeader.tsx`の右側領域に、申請者側と同一パターンのログアウトコントロールを追加する
  - クリック（およびキーボード操作）で`signOut`を呼び出し、完了後にサインイン画面へ遷移する
  - 既存のロゴ・ヘルプデスクバッジ・言語切替・ポータル切り替えリンクの表示・配置を変更しないことで完了とする
  - _Requirements: 13.2, 13.3, 13.4, 13.6, 13.7_
  - _Boundary: HelpdeskHeader_
  - _Depends: 6.1_

- [x] 6.4 (P) HelpdeskAppShellの開閉ボタンのaria-labelをi18n化する
  - `HelpdeskAppShell.tsx`に`useTranslations`を導入し、サイドバー開閉ボタンの`aria-label`を日本語ハードコードから翻訳キー経由の解決に置き換える（展開/折りたたみの2状態）
  - サイドバーの開閉挙動・折りたたみ状態のロジック・レイアウトを変更しないことで完了とする
  - _Requirements: 14.1, 14.4_
  - _Boundary: HelpdeskAppShell_
  - _Depends: 6.1_

- [x] 6.5 (P) ログアウト・i18n化の多言語表示・動作を確認する
  - 日本語・英語両ロケールで両ヘッダーのログアウトコントロールの文言・`HelpdeskAppShell`開閉ボタンの`aria-label`が正しく切り替わることを確認する
  - ログアウト操作でセッションが終了し、サインイン画面へ遷移することを確認する
  - 上記確認が問題ないことで完了とする
  - _Requirements: 13.3, 13.4, 13.5, 14.2, 14.3_
  - _Depends: 6.2, 6.3, 6.4_

---

## 追加ラウンド（2026-07-22）: モバイル幅のドロワー型ナビゲーション・ヘッダー副題の省略回避

- [ ] 7. モバイルドロワーナビゲーションとヘッダー副題の省略回避
- [ ] 7.1 ナビゲーション項目定義・アクティブ判定を共有モジュールへ集約する
  - `src/components/layout/nav-items.ts`を新設し、`Sidebar.tsx`の`NAV_ITEMS`を`APPLICANT_NAV_ITEMS`として、`HelpdeskSidebar.tsx`の`HELPDESK_NAV_ITEMS`をそのまま移設する（項目・アイコン・並び順・翻訳キー・遷移先を1件も変えない）
  - `Sidebar.tsx`の`resolveActiveHref`を`resolveActiveHref(pathname, items, rootHref)`の形に一般化して移設する（ルート直下は完全一致のみ、それ以外はパス区切りを伴う前方一致、最長一致優先）
  - `Sidebar.tsx`を`APPLICANT_NAV_ITEMS`＋`resolveActiveHref(..., "/")`を参照するよう変更し、表示・アクティブ判定結果が変更前と同一であることを確認する
  - `HelpdeskSidebar.tsx`を`HELPDESK_NAV_ITEMS`＋`resolveActiveHref(..., "/helpdesk")`を参照するよう変更し、既存の見え方（各項目のアクティブ表示）が変わらないことを確認する
  - 観測可能な完了条件: `npm run lint`・`npm run typecheck`・`npm run build`が成功し、申請者側・ヘルプデスク側サイドバーの項目表示・子ルートでのアクティブ表示が従来と同一であること
  - _Requirements: 15.4, 15.5_
  - _Boundary: nav-items（新規）, Sidebar, HelpdeskSidebar_

- [ ] 7.2 モバイルドロワー用の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`の`nav`・`helpdeskNav`名前空間に、`openMenu`（メニューを開く / Open menu）・`closeMenu`（メニューを閉じる / Close menu）を追加する
  - 既存キー（`sidebarLabel`等）は変更しない。ドロワーのタイトルには既存の`sidebarLabel`を再利用する
  - 観測可能な完了条件: `ja.json`で追加したキーが全て`en.json`にも存在し、キー構造が一致していること
  - _Requirements: 15.9_
  - _Boundary: i18n messages_

- [ ] 7.3 共有MobileNav（ハンバーガー＋ドロワー）コンポーネントを実装する
  - `src/components/layout/MobileNav.tsx`を新設する。`@radix-ui/react-dialog`を土台に、`md:hidden`のハンバーガートグル（`Menu`アイコン）と左スライドインのドロワー（オーバーレイ＋パネル）を実装する
  - props（`items: NavItem[]`, `namespace: "nav" | "helpdeskNav"`, `rootHref: string`）を受け取り、`items`から`@/i18n/navigation`の`Link`でナビゲーション項目を描画する。ラベルは`useTranslations(namespace)`経由で解決する
  - アクティブ判定は`resolveActiveHref(pathname, items, rootHref)`を用い、既存サイドバーと同一のアクティブ表現（`bg-primary text-primary-foreground font-semibold`等）を適用する
  - 項目クリックでドロワーを閉じてから遷移する（`onOpenChange`と各`Link`の`onClick`で`open`状態を制御）
  - トグルの`aria-label`に`{namespace}.openMenu`、閉じるボタンの`aria-label`に`{namespace}.closeMenu`、ドロワーのタイトル（`Dialog.Title`）に`{namespace}.sidebarLabel`を用いる
  - Radix Dialogの標準機能によりフォーカストラップ・Escapeでのクローズ・オーバーレイクリックでのクローズ・背後スクロール抑止・クローズ時のトリガーへのフォーカス復帰が働くことを確認する
  - 観測可能な完了条件: モバイル幅で`MobileNav`単体が開閉でき、項目・アクティブ表示・キーボード操作（Enter/Space/Escape/Tab）が期待どおり動作すること
  - _Requirements: 15.1, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9_
  - _Boundary: MobileNav（新規）_
  - _Depends: 7.1, 7.2_

- [ ] 7.4 両ヘッダーにMobileNavを組み込む
  - `Header.tsx`のヘッダー左端（ロゴ・タイトルリンクの直前）に`<MobileNav items={APPLICANT_NAV_ITEMS} namespace="nav" rootHref="/" />`を追加する
  - `HelpdeskHeader.tsx`の同位置に`<MobileNav items={HELPDESK_NAV_ITEMS} namespace="helpdeskNav" rootHref="/helpdesk" />`を追加する
  - `AppShell.tsx`・`HelpdeskAppShell.tsx`は変更しない（状態は`MobileNav`内に閉じる）。`md`以上の既存レイアウト（サイドバー`hidden md:block`・折りたたみトグル`md:flex lg:hidden`）が不変であることを確認する
  - 観測可能な完了条件: 幅375px（モバイル）で申請者側・ヘルプデスク側の各ページにハンバーガーが表示され、開くとそのポータルの全ナビゲーション項目が表示され、項目クリックで遷移して閉じる。幅768px以上ではハンバーガーが表示されず、既存サイドバー・トグルの挙動が変わらず横スクロールも発生しない
  - _Requirements: 15.1, 15.2, 15.10, 15.11_
  - _Boundary: Header, HelpdeskHeader_
  - _Depends: 7.3_

- [ ] 7.5 両ヘッダーのタイトル領域を副題省略回避構造に変更する
  - `Header.tsx`・`HelpdeskHeader.tsx`のタイトル`<span>`を、`portalName`要素と`screenName`（区切り「 / 」を含む）要素に分離する
  - タイトルリンクを残余幅占有・縮小許容（`min-w-0`＋`flex-1`相当）にし、ヘッダー全体で横スクロールを起こさない
  - `portalName`は`hidden sm:inline`とし`truncate`を付けない。`screenName`は副題を省略なく表示できる幅でのみ`inline`にし、それ未満では非表示（`display:none`）にする（`truncate`による「…」を出さない）
  - 副題を表示する境界（推奨既定`hidden xl:inline`、余裕があれば`lg:inline`に緩める）は、7.6の実機確認で768/834/1024/1280・日英に対し「…」が出ない最小境界に確定する
  - 必要な場合に限り、タブレット帯でポータル切り替えリンクをアイコンのみ表示にする密度調整を行ってよい（機能・遷移先・アクセシブルな名前は保持）
  - 観測可能な完了条件: いずれの対象幅・ロケールでもタイトルに「…」省略が発生せず、副題は「完全表示」か「非表示」のいずれかになること
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_
  - _Boundary: Header, HelpdeskHeader_

- [ ] 7.6 (P) モバイルドロワー・ヘッダー副題の多言語/レスポンシブ実機確認
  - playwrightで日本語・英語両ロケールを対象に、幅375px（モバイル）でハンバーガー→ドロワー開閉・項目遷移・Escape/オーバーレイ/閉じるボタンでのクローズ・クローズ後のトグルへのフォーカス復帰を、申請者側・ヘルプデスク側の双方で確認する
  - 幅768px以上でハンバーガーが非表示、既存サイドバー・折りたたみトグルの挙動不変、横スクロールなしを確認する
  - 幅768/834/1024/1280で両ヘッダーのタイトルに「…」省略が発生しないこと・横スクロールが発生しないことを確認し、7.5の副題表示境界を確定する
  - 観測可能な完了条件: 上記確認が全ロケール・全対象幅で問題ないこと
  - _Requirements: 15.1〜15.11, 16.1〜16.7_
  - _Depends: 7.4, 7.5_

- [ ] 8. 認証済みヘッダーからの反対ロール切り替えリンク（デッドリンク）を撤去する（2026-07-22 追記）
- [ ] 8.1 両ヘッダーから切り替えリンクを削除し未使用インポートを除去する
  - `src/components/layout/Header.tsx`から`header.switchToHelpdesk`の`<Link href="/helpdesk">`（`ArrowLeftRight`アイコン＋テキスト）を削除する
  - `src/components/layout/HelpdeskHeader.tsx`から`helpdeskHeader.switchToApplicant`の`<Link href="/">`を削除する
  - 両ファイルで未使用になる`ArrowLeftRight`インポートを削除する（`useLocale`はログアウトの`callbackUrl`で使うHeader側では残す）
  - ロゴ／タイトルのダッシュボードリンク・`LanguageSwitcher`・ログアウトボタンは変更しない
  - `tsc --noEmit` / `npm run lint` がエラーなく通ることを確認する
  - _Requirements: 17.1, 17.2, 17.3, 17.6_
  - _Boundary: Header, HelpdeskHeader_
- [ ] 8.2 (P) 不要な翻訳キーを削除する
  - `messages/ja.json`・`messages/en.json`から`header.switchToHelpdesk`・`helpdeskHeader.switchToApplicant`を削除する
  - ログイン画面用の`login.switchToHelpdeskLogin`・`login.switchToApplicantLogin`は変更しない
  - 他の翻訳キーに影響がないこと（`next-intl`の欠落キーエラーが出ないこと）を確認する
  - _Requirements: 17.4, 17.5_
- [ ] 8.3 ヘッダーテストを切り替えリンク不在の検証へ更新する
  - `Header.test.tsx`・`HelpdeskHeader.test.tsx`の「切り替えリンクが表示される」既存アサーションを、`queryByRole`等で「切り替えリンクが存在しない」ことを検証する内容へ更新する
  - ロゴ・言語切替・ログアウトに関する既存アサーションは維持する
  - `npm test`が通ることを確認する
  - _Requirements: 17.7_
  - _Depends: 8.1_
- [ ] 8.4 (P) 撤去後の実機・レスポンシブ確認
  - playwrightで日本語・英語両ロケールを対象に、申請者側・ヘルプデスク側の各ヘッダーに切り替えリンクが表示されないこと、ロゴ・言語切替・ログアウトが従来どおり機能することを確認する
  - 幅375/768/834/1024/1280で両ヘッダーに横スクロールが発生しないこと、Requirement 16（副題省略回避）と矛盾しないことを確認する
  - 反対ポータルへの正規導線（ログアウト→ログイン画面のクロスログインリンク）が引き続き機能することを確認する
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.8_
  - _Depends: 8.1, 8.2_

- [ ] 9. 共通アプリ内確認モーダル `ConfirmDialog` を新設する（2026-07-22 追記 / 要件18）
  - `src/components/ui/confirm-dialog.tsx`（`"use client"`）を新規作成し、既存の`Dialog`系プリミティブ（`src/components/ui/dialog.tsx`）と`Button`を用いて、トリガーボタン・見出し・本文（対象名を含められるReactNode）・確認/キャンセルボタンを表示する再利用可能コンポーネントを実装する
  - propsで全表示文言・`onConfirm`・`isPending`・各`variant`を受け取り、確認押下時のみ`onConfirm`を実行、`isPending`中は確認ボタンを`disabled`にする。キャンセル/Overlay/Escでは`onConfirm`を呼ばずに閉じる
  - コンポーネント内に固定の表示文言・翻訳キーを持たせない（i18nは利用側の責務）
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.9_
  - _Depends: なし（既存 dialog.tsx / button.tsx を利用）_

- [ ]* 9.1 `ConfirmDialog` の単体テストを追加する
  - トリガー押下でモーダルが開き`title`・`description`が表示されること、確認押下で`onConfirm`が1回呼ばれること、キャンセル/Esc/Overlayで`onConfirm`が呼ばれず閉じること、`isPending`中は確認ボタンが`disabled`になることを`src/components/ui/confirm-dialog.test.tsx`で検証する
  - _Requirements: 18.3, 18.4, 18.5, 18.6_
  - _Depends: 9_
