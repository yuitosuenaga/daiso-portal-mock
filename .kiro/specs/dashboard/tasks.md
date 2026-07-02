# 実装タスク: dashboard

## 実装計画

- [x] 1. 基盤セットアップ（Next.js プロジェクト・依存パッケージ・next-intl 設定）
- [x] 1.1 Next.js プロジェクトを初期化し、必要なパッケージをインストールする
  - `create-next-app` で TypeScript・Tailwind CSS・App Router を有効にしたプロジェクトを作成する
  - next-intl、shadcn/ui（CLI経由）、lucide-react をインストールする
  - `tsconfig.json` の strict モードが有効であることを確認する
  - `npm run build` が警告なく完了することで完了とする
  - _Requirements: 5.1_

- [x] 1.2 next-intl のルーティング設定とミドルウェアを実装する
  - `i18n/routing.ts` に `locales: ['ja', 'en']`・`defaultLocale: 'ja'` を定義する
  - `i18n/request.ts` にサーバーサイドのリクエスト設定（メッセージファイルの読み込み）を実装する
  - `middleware.ts` に next-intl のロケール検出・リダイレクトロジックを実装する
  - `http://localhost:3000/` にアクセスすると `/ja` へ 307 リダイレクトされることで完了とする ✅
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 1.3 日本語・英語の翻訳ファイルを作成し、初期キースキーマを定義する
  - `messages/ja.json` にヘッダー・ナビゲーション・ダッシュボード用の全翻訳キーを定義する
  - `messages/en.json` に同一キー構造で英語テキストを定義する
  - 存在しないキーへのアクセス時に英語へフォールバックするよう `i18n/request.ts` を設定する
  - 両ファイルのキー構造が一致していること（`ja.json` で定義した全キーが `en.json` にも存在する）で完了とする
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 1.4 共有型定義（Announcement・InquiryStatusSummary）を作成する
  - `types/announcement.ts` に `Announcement` インターフェースを定義する（id / title / publishedAt）
  - `types/inquiry-summary.ts` に `InquiryStatusSummary` インターフェースを定義する（new / in_progress / resolved）
  - `any` 型を使用せず strict TypeScript で定義されていることで完了とする
  - _Requirements: 6.2_

- [x] 1.5 モック API 関数を実装する
  - `lib/api/announcements.ts` に `getRecentAnnouncements(options?)` をダミーデータ付きで実装する
  - `lib/api/inquiries.ts` に `getInquiryStatusSummary()` をダミーデータ付きで実装する
  - 両関数が `Promise.resolve()` でデータを返し、呼び出し側が `await` できることで完了とする
  - _Requirements: 6.1, 6.2, 6.3_

---

- [x] 2. レイアウトレイヤー（AppShell・Header・Sidebar・LanguageSwitcher）
- [x] 2.1 AppShell コンポーネントを実装する
  - ヘッダー（上部固定）・サイドバー（左固定）・メインコンテンツ（残余領域）の 3 エリア flex レイアウトを Tailwind で構成する
  - `isSidebarCollapsed` 状態を `useState` で保持し、Sidebar へ `isCollapsed` として渡す
  - ルート要素に `overflow-x-hidden` を適用して横スクロールを防ぐ
  - 768px 幅のブラウザで横スクロールバーが表示されないことで完了とする
  - _Requirements: 1.1, 1.2_
  - _Boundary: AppShell_

- [x] 2.2 (P) Header コンポーネントを実装する
  - ポータルタイトルを next-intl の `t('header.title')` 翻訳キー経由で表示する
  - LanguageSwitcher コンポーネントを配置する
  - JSX 内に文字列をハードコードせず、全テキストが翻訳キー経由であることで完了とする
  - _Requirements: 2.1, 2.4_
  - _Boundary: Header_
  - _Depends: 1.3_

- [x] 2.3 (P) LanguageSwitcher コンポーネントを実装する
  - 「日本語」「English」の選択肢を表示する言語切り替え UI を実装する
  - next-intl の `useRouter().replace()` を使い、現在のパスを保持したままロケールを切り替える
  - 切り替えボタンを押すと URL が `/ja/...` ↔ `/en/...` に変わり、UI 全体のテキストが切り替わることで完了とする
  - _Requirements: 2.2, 2.3, 5.1_
  - _Boundary: LanguageSwitcher_
  - _Depends: 1.2, 1.3_

- [x] 2.4 Sidebar コンポーネントを実装する
  - `NAV_ITEMS` 定数に 6 項目（ダッシュボード・問い合わせ申請・問い合わせ一覧・お知らせ・リンク集・FAQ）をアイコン・翻訳キー・パスのセットで定義する
  - `usePathname()` の戻り値からロケールプレフィックスを除去し、現在のパスと一致する項目をアクティブスタイルで強調表示する
  - `isCollapsed` が `true` のときアイコンのみ、`false` のときアイコン＋ラベルを表示する
  - `lg:` ブレークポイント（≥1280px）でサイドバーが展開幅、`md:` ブレークポイント（768px–1279px）でアイコン幅になることで完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 1.3, 1.4_
  - _Boundary: Sidebar_
  - _Depends: 1.3_

---

- [x] 3. ルートレイアウトとロケールレイアウトの組み立て
- [x] 3.1 ルートレイアウト（`app/layout.tsx`）を実装する
  - HTML の `<html>` / `<body>` 基盤・Noto Sans 系フォントの適用・グローバル CSS のインポートを実装する
  - `lang` 属性に locale を設定する
  - `npm run build` でビルドエラーが発生しないことで完了とする
  - _Requirements: 1.1_

- [x] 3.2 ロケールレイアウト（`app/[locale]/layout.tsx`）を実装する
  - `NextIntlClientProvider` でメッセージを提供する
  - `AppShell` をインポートして `{children}` を渡す
  - `/ja` ・ `/en` いずれのパスでも AppShell（ヘッダー＋サイドバー＋メインコンテンツ）が描画されることで完了とする ✅
  - _Requirements: 1.1, 5.1_
  - _Depends: 2.1, 2.2, 2.3, 2.4, 3.1_

---

- [x] 4. ダッシュボードトップページとウィジェット
- [x] 4.1 (P) AnnouncementWidget を実装する
  - async Server Component として `getRecentAnnouncements({ limit: 3 })` を `await` で呼び出す
  - 取得した最大 3 件のお知らせをタイトル・日付付きでリスト表示する
  - `try-catch` でエラーをキャッチし、エラー時は翻訳キー経由のエラーメッセージを表示する
  - Suspense の fallback として Skeleton UI を表示するコンポーネント（`AnnouncementWidgetSkeleton`）を用意する
  - ブラウザで `/ja` を開くとお知らせが最大 3 件表示されることで完了とする
  - _Requirements: 4.2, 4.5, 4.6, 6.1, 6.3_
  - _Boundary: AnnouncementWidget_
  - _Depends: 1.4, 1.5_

- [x] 4.2 (P) InquiryStatusWidget を実装する
  - async Server Component として `getInquiryStatusSummary()` を `await` で呼び出す
  - 新規・対応中・解決済みの件数を shadcn/ui の Card コンポーネントを使って 3 枚並べて表示する
  - `try-catch` でエラーをキャッチし、エラー時は翻訳キー経由のエラーメッセージを表示する
  - Suspense の fallback として Skeleton UI を表示するコンポーネントを用意する
  - ブラウザで `/ja` を開くと 3 枚のステータスカードが表示されることで完了とする
  - _Requirements: 4.3, 4.5, 4.6, 6.1, 6.3_
  - _Boundary: InquiryStatusWidget_
  - _Depends: 1.4, 1.5_

- [x] 4.3 ダッシュボードトップページ（`app/[locale]/page.tsx`）を実装する
  - AnnouncementWidget・InquiryStatusWidget を `<Suspense>` で囲んでページに配置する
  - 「新規問い合わせを申請する」CTA リンク（next-intl `Link`、`href="/inquiry/new"`）を配置する
  - `/ja` にアクセスするとウィジェット 2 つと CTA リンクが表示されることで完了とする
  - _Requirements: 4.1, 4.4_
  - _Depends: 4.1, 4.2_

---

- [x] 5. 後続ページ用プレースホルダーの追加
- [x] 5.1 ナビゲーションリンク先ページのプレースホルダーを作成する
  - `app/[locale]/inquiry/new/page.tsx`・`app/[locale]/inquiry/page.tsx`・`app/[locale]/announcements/page.tsx`・`app/[locale]/links/page.tsx`・`app/[locale]/faq/page.tsx` をそれぞれ「準備中」表示の最小実装で作成する
  - サイドバーの各ナビ項目をクリックしても 404 にならず、対応するプレースホルダーページが表示されることで完了とする ✅
  - _Requirements: 3.3_

---

- [x] 6. 検証とテスト
- [x] 6.1 レイアウトのレスポンシブ動作を検証する
  - Chrome DevTools で 768px・1280px・1440px の各幅でダッシュボードページを確認する
  - 768px でサイドバーがアイコンのみ表示になり、横スクロールが発生しないことを確認する
  - 1280px 以上でサイドバーが常時展開されることを確認する
  - `npm run typecheck` および `npm run lint` がエラーなく通ることで完了とする ✅
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 6.2 言語切り替え動作を検証する
  - `/ja` でポータルを開き、LanguageSwitcher で English を選択すると `/en` へ遷移し全テキストが英語に切り替わることを確認する
  - `/en` から日本語へ切り替えると `/ja` へ遷移し全テキストが日本語に戻ることを確認する
  - 翻訳キーが不足している場合に英語フォールバックが機能することをコンソール警告で確認する
  - _Requirements: 2.3, 5.1, 5.2, 5.3_

- [x] 6.3 ダッシュボードページの表示内容を検証する
  - ルートURL（`/`）にアクセスすると `/ja` へリダイレクトされ、お知らせウィジェットと問い合わせステータスウィジェットが表示されることを確認する
  - お知らせが最大 3 件表示されること、ステータスカードが 3 枚（新規・対応中・解決済み）表示されることを確認する
  - CTA リンクをクリックすると問い合わせ申請プレースホルダーページへ遷移することを確認する
  - `npm run build` が警告なく完了することで完了とする ✅
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] * 6.4 Sidebar アクティブ状態のユニットテストを作成する（オプション・後回し可）
  - `usePathname()` のモックを使い、各ナビ項目のパスに対応するアクティブスタイルが適用されることをテストする
  - ロケールプレフィックス（`/ja`・`/en`）が含まれるパスでも正しくアクティブ判定されることを確認する
  - _Requirements: 3.2_

- [ ] * 6.5 LanguageSwitcher のユニットテストを作成する（オプション・後回し可）
  - `useRouter().replace()` のモックを使い、ロケール切り替え時に正しいロケールと現在のパスで呼ばれることをテストする
  - _Requirements: 2.3_

---

- [x] 7. ダッシュボードの情報量強化（お知らせ拡張・新規ウィジェット追加）
- [x] 7.1 (P) AnnouncementWidget を拡張する
  - `getRecentAnnouncements({ limit: 5 })` に変更し表示件数を5件に増やす
  - 各項目に `Badge variant={item.category}` でカテゴリバッジを表示する（既存の `announcements.categories` 翻訳キーを再利用）
  - 各項目を `Link href={`/announcements/${item.id}`}` でラップし、ウィジェット下部に `/announcements` への遷移リンク（`dashboard.announcements.viewAll`）を追加する
  - `/ja` を開くとお知らせが5件・カテゴリバッジ付きで表示され、項目クリックで詳細ページへ遷移することで完了とする
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 1.3_
  - _Boundary: AnnouncementWidget_

- [x] 7.2 (P) RecentInquiriesWidget を新規実装する
  - async Server Component として `getInquiries()` を呼び出し、戻り値の先頭5件を表示する
  - 各項目に案件種別（`inquiryForm.options.category.*`）・緊急度バッジ（`urgency-*` variant）・対応状況バッジ（`status-*` variant）・送信日時を表示する
  - 各項目を `Link href={`/inquiry/${item.id}`}` でラップし、ウィジェット下部に `/inquiry` への遷移リンク（`dashboard.recentInquiries.viewAll`）を追加する
  - 0件時は空状態メッセージ、取得失敗時はエラーメッセージを表示し、Suspense fallback用の Skeleton コンポーネントを用意する
  - `/ja` を開くと自社の問い合わせが送信日時降順で5件表示され、項目クリックで詳細ページへ遷移することで完了とする
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.2, 11.3, 11.4_
  - _Boundary: RecentInquiriesWidget_

- [x] 7.3 (P) QuickLinksWidget を新規実装する
  - async Server Component として `getLinks()` を呼び出し、戻り値の先頭4〜6件を表示する
  - 各項目を `<a target="_blank" rel="noopener noreferrer">` で新しいタブで開けるようにする
  - ウィジェット下部に `/links` への遷移リンク（`dashboard.quickLinks.viewAll`）を追加する
  - Suspense fallback用の Skeleton コンポーネントを用意する
  - `/ja` を開くとリンクショートカットが表示され、クリックすると新しいタブでリンク先が開くことで完了とする
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 11.2, 11.3, 11.4_
  - _Boundary: QuickLinksWidget_

- [x] 7.4 (P) FaqPickWidget を新規実装する
  - async Server Component として `getFaqs()` を呼び出し、戻り値の先頭3〜5件の質問を表示する
  - 各項目・ウィジェット下部の遷移リンク（`dashboard.faqPick.viewAll`）はいずれも `/faq` へ遷移する
  - Suspense fallback用の Skeleton コンポーネントを用意する
  - `/ja` を開くとFAQピックアップが表示され、項目クリックでFAQページへ遷移することで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.2, 11.3, 11.4_
  - _Boundary: FaqPickWidget_

- [x] 7.5 ダッシュボードページに新規ウィジェットを統合する
  - `app/[locale]/page.tsx` に `RecentInquiriesWidget`・`QuickLinksWidget`・`FaqPickWidget` を、それぞれ対応する Skeleton を fallback とした `<Suspense>` で囲んで配置する
  - 既存のレイアウト幅（`max-w-4xl`）を `max-w-6xl` に広げ、新規ウィジェットを縦方向に整理して配置する
  - 768px幅・1280px以上の両方でレイアウトが崩れず横スクロールが発生しないことを確認する
  - `/ja` を開くと既存の2ウィジェットに加え、自社の問い合わせ一覧・よく使うリンク・FAQピックアップの3ウィジェットが表示されることで完了とする
  - _Requirements: 11.1_
  - _Depends: 7.1, 7.2, 7.3, 7.4_

---

- [x] 8. ダッシュボード情報量強化の検証
- [x] 8.1 新規ウィジェットの表示・遷移動作を検証する
  - お知らせ・問い合わせ一覧の項目クリックで各詳細ページへ遷移すること、よく使うリンクのクリックで新しいタブが開くこと、FAQ項目クリックでFAQページへ遷移することを確認する
  - 各ウィジェット下部の「一覧を見る」リンクから対応する一覧ページへ遷移できることを確認する
  - _Requirements: 7.3, 7.5, 8.3, 8.4, 9.3, 9.4, 10.3, 10.4_

- [x] 8.2 レスポンシブ・多言語表示を検証する
  - 768px幅・1280px以上の両方でダッシュボード全体のレイアウトが崩れないことを確認する
  - `/en` で全ウィジェットの表示テキストが英語に切り替わること、既存の翻訳キー（`inquiryForm.options.*`・`inquiryList.status.*`・`announcements.categories.*`・`links.categories.*`）が新規ウィジェットでも正しく参照されることを確認する
  - `npm run build` / `npm run lint` / `npx tsc --noEmit` がエラーなく完了することで完了とする
  - _Requirements: 11.1, 11.3, 11.4, 11.5_
