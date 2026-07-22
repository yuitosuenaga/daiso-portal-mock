# Implementation Plan

- [x] 1. Foundation: データ層とi18n基盤整備
- [x] 1.1 (P) 全社問い合わせ状況集計機能の追加
  - 全社（自社限定なし）の問い合わせをステータス（新規・対応中・解決済み）別に集計する機能を、既存の自社向け集計と対になる形で追加する
  - 集計対象は既存の全社問い合わせ取得結果とする
  - 観測可能な完了条件: 単体テストで、全社分の新規・対応中・解決済み件数が正しく算出されることを検証できる
  - _Requirements: 2.2, 2.7_

- [x] 1.2 (P) ダッシュボード関連の翻訳キー整備
  - 申請者側5カード（問い合わせ申請・問い合わせ一覧・お知らせ・リンク・FAQ）分のタイトル・説明文言を日本語・英語の両方に追加する
  - ヘルプデスク側6カード（問い合わせ一覧・テンプレート管理・お知らせ管理・問い合わせ申請フォーム・リンク・FAQ）分のタイトル・説明文言、および対応系/参照系セクションの見出し文言を日本語・英語の両方に追加する
  - ヘルプデスクナビゲーションに「リンク」「FAQ」ラベルを追加し、既存の「ホーム」ラベルの表示文言を「ダッシュボード」に変更する
  - 実態と乖離した既存のプレースホルダー案内文言（今後追加予定である旨の文言）を削除する
  - 観測可能な完了条件: 日本語・英語どちらの言語でも新規カード・ナビゲーション項目の文言が欠落なく表示される
  - _Requirements: 4.5_

- [x] 2. NavigationCard基盤コンポーネントの実装
  - アイコン・タイトル・説明・任意の件数バッジを表示し、カード全体のクリック（キーボード操作含む）で指定ページへ遷移する、両ポータル共通のナビゲーションカードを実装する
  - バッジの件数が0件の場合はバッジを表示しない
  - データ読み込み中に表示するスケルトン表示を実装する
  - DAISOブランドカラー（CSS変数経由のトークン）と既存のCardコンポーネントをベースにスタイリングする
  - 観測可能な完了条件: 単体テストでバッジあり・バッジなし・スケルトン表示の3パターンが正しくレンダリングされることを確認できる
  - _Requirements: 1.3, 1.4, 2.1, 4.1, 4.3, 4.4_

- [x] 3. データ連動カードコンポーネントの実装
- [x] 3.1 (P) InquiryListCard（問い合わせ状況カード）の実装
  - 自社スコープ・全社スコープを切り替え可能な形で問い合わせ状況集計を取得し、未対応件数（新規＋対応中の合計）をバッジとしてNavigationCardへ渡す
  - 集計データの取得に失敗した場合は、バッジなしのNavigationCardとして表示し、例外を上位に伝播させない
  - 観測可能な完了条件: 自社スコープ・全社スコープそれぞれについて、正常時のバッジ件数表示とデータ取得失敗時のフォールバック表示が単体テストで検証できる
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.2, 2.7, 2.9_
  - _Boundary: InquiryListCard_

- [x] 3.2 (P) AnnouncementsCard（お知らせカード）の実装
  - 直近7日以内に公開されたお知らせの件数を算出し、1件以上あればバッジとしてNavigationCardへ渡す
  - お知らせデータの取得に失敗した場合は、バッジなしのNavigationCardとして表示し、例外を上位に伝播させない
  - 観測可能な完了条件: 7日以内・7日超の境界値を含む単体テストで件数算出とフォールバック表示が検証できる
  - _Requirements: 1.1, 1.5, 1.6_
  - _Boundary: AnnouncementsCard_

- [x] 4. ヘルプデスク側「リンク」「FAQ」ページの新規追加
- [x] 4.1 (P) ヘルプデスク側「リンク」ページの新規追加
  - 申請者側の「リンク」ページと同一のリンク一覧表示を、ヘルプデスク側の新しいページとして追加する
  - 観測可能な完了条件: ヘルプデスク側「リンク」ページで、申請者側と同一件数・同一内容のリンク一覧が表示される
  - _Requirements: 3.1_
  - _Boundary: HelpdeskLinksPage_

- [x] 4.2 (P) ヘルプデスク側「FAQ」ページの新規追加
  - 申請者側の「FAQ」ページと同一のFAQ一覧表示を、ヘルプデスク側の新しいページとして追加する
  - 観測可能な完了条件: ヘルプデスク側「FAQ」ページで、申請者側と同一件数・同一内容のFAQ一覧が表示される
  - _Requirements: 3.2_
  - _Boundary: HelpdeskFaqPage_

- [x] 5. ダッシュボードページ・ナビゲーションの統合
- [x] 5.1 (P) 申請者側トップページのカードハブ化
  - 既存の5ウィジェット（お知らせ・問い合わせ状況・自社の問い合わせ・よく使うリンク・FAQ）構成を廃止し、「問い合わせ申請」「問い合わせ一覧」「お知らせ」「リンク」「FAQ」の5枚のナビゲーションカードで構成する
  - タブレット幅以上でカードがグリッドレイアウトで折り返し表示されるようにする
  - 不要になった既存5ウィジェットコンポーネントおよび対応するテストファイルを削除する
  - 観測可能な完了条件: 申請者側トップページを開くと5枚のカードが表示され、各カードのクリックで対応するページへ正しく遷移する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: ApplicantDashboardPage_

- [x] 5.2 (P) ヘルプデスク側トップページのカードハブ化と案内文言の解消
  - 実態と乖離したプレースホルダー案内文言を廃止し、対応系（問い合わせ一覧・テンプレート管理・お知らせ管理）と参照系（問い合わせ申請フォーム・リンク・FAQ）の2セクションに区分した6枚のナビゲーションカードを表示する
  - 「お知らせ管理」カードは、別スペックが提供するお知らせ管理ページへの遷移リンクとして実装する（実装着手前に当該ページのルートが利用可能であることを確認する）
  - タブレット幅以上でカードがグリッドレイアウトで折り返し表示されるようにする
  - 観測可能な完了条件: ヘルプデスク側トップページに実態と一致した6枚のカードがセクション分けされて表示され、各カードから対応するページへ正しく遷移する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: HelpdeskDashboardPage_
  - _Depends: 4.1, 4.2_

- [x] 5.3 (P) ヘルプデスクサイドバーのナビゲーション更新
  - ヘルプデスク側サイドバーに「リンク」「FAQ」への遷移項目を追加し、既存の「ホーム」表示ラベルを「ダッシュボード」に変更する
  - 別スペックが同じナビゲーション定義に「お知らせ管理」項目を追加する可能性があるため、実装時点の差分を確認し、統合時に競合が生じないよう配慮する
  - 観測可能な完了条件: ヘルプデスク側サイドバーに「ダッシュボード」「問い合わせ管理」「テンプレート管理」「リンク」「FAQ」の各項目が表示され、それぞれ対応するページへ正しく遷移する
  - _Requirements: 2.8, 3.3_
  - _Boundary: HelpdeskSidebar_
  - _Depends: 4.1, 4.2_

- [x] 6. 検証: レスポンシブ・多言語・アクセシビリティの確認
  - タブレット幅以上で両ポータルのカードがグリッドで崩れず折り返し表示されることを確認する
  - 日本語・英語の切り替えで両ポータルの全カード・ナビゲーション項目の文言が正しく表示されることを確認する
  - キーボード操作のみで両ポータルの全カードへアクセス・遷移できることを確認する
  - 削除した既存ウィジェットへの参照が残っていないことをビルド・型チェックで確認する
  - 観測可能な完了条件: 上記4項目の確認結果に問題がない、または発見した問題が修正済みであることが記録される
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 7. 「対応が必要な問い合わせ」優先度並び替えロジックの追加
  - 未着手（誰も対応着手していない）であることを最優先とし、次に緊急度（高→中→低）、次に受付日時の降順で問い合わせを並び替える関数を追加する
  - 既存の問い合わせ一覧ページ（`/helpdesk/inquiries`）が使用する並び替えロジックは変更しない
  - 観測可能な完了条件: 単体テストで、未着手/着手済み・緊急度・受付日時の組み合わせパターンに対して意図した並び順になることを検証できる
  - _Requirements: 6.3_

- [x] 8. プレビューパネルコンポーネントの実装
- [x] 8.1 (P) 「最新のお知らせ」プレビューパネルの実装
  - 直近のお知らせを最大5件、公開日の降順でタイトル・カテゴリ・日付付きに一覧表示する
  - お知らせが0件の場合は空状態メッセージを、データ取得に失敗した場合はエラー状態を表示し、例外を上位に伝播させない
  - パネル下部にお知らせ一覧ページへの遷移リンクを表示する
  - 表示に使用するタイトル・説明・空状態・エラー状態の文言を日本語・英語両方の翻訳キーとして追加する
  - 観測可能な完了条件: 単体テストで、正常表示（複数件）・空状態・エラー時フォールバックの3パターンが検証できる
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - _Boundary: AnnouncementsPreviewPanel_

- [x] 8.2 (P) 「対応が必要な問い合わせ」プレビューパネルの実装
  - 全社の問い合わせのうちステータスが新規または対応中のものを対象に、優先度並び替えロジックで並べた上位5件を会社名・案件種別・緊急度・対応状況付きで一覧表示する
  - 対応が必要な問い合わせが0件の場合は空状態メッセージを、データ取得に失敗した場合はエラー状態を表示し、例外を上位に伝播させない
  - パネル下部に問い合わせ一覧ページへの遷移リンクを表示する
  - 表示に使用するタイトル・説明・空状態・エラー状態の文言を日本語・英語両方の翻訳キーとして追加する
  - 観測可能な完了条件: 単体テストで、正常表示（複数件・優先順位反映）・空状態・エラー時フォールバックの3パターンが検証できる
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - _Boundary: PriorityInquiriesPreviewPanel_
  - _Depends: 7_

- [x] 9. ダッシュボードページへのプレビューパネル統合
- [x] 9.1 (P) 申請者側ダッシュボードへの「最新のお知らせ」プレビューパネル統合
  - ナビゲーションカード群を画面上部に維持したまま、その下部に「最新のお知らせ」プレビューパネルを配置する
  - 観測可能な完了条件: 申請者側トップページで、5枚のカードの下に最新のお知らせが一覧表示され、各項目のクリックで詳細ページへ遷移する
  - _Requirements: 4.6, 5.1_
  - _Boundary: ApplicantDashboardPage_
  - _Depends: 8.1_

- [x] 9.2 (P) ヘルプデスク側ダッシュボードへの「対応が必要な問い合わせ」プレビューパネル統合
  - ナビゲーションカード群を画面上部に維持したまま、その下部に「対応が必要な問い合わせ」プレビューパネルを配置する
  - 観測可能な完了条件: ヘルプデスク側トップページで、6枚のカードの下に対応が必要な問い合わせが一覧表示され、各項目のクリックで詳細ページへ遷移する
  - _Requirements: 4.6, 6.1_
  - _Boundary: HelpdeskDashboardPage_
  - _Depends: 8.2_

- [x] 10. 検証: プレビューパネルのレイアウト順序・多言語・回帰確認
  - 両ポータルともナビゲーションカードが画面上部、プレビューパネルがその下部に表示されることを確認する
  - 日本語・英語の切り替えでプレビューパネルの文言（タイトル・空状態・エラー状態含む）が正しく表示されることを確認する
  - 既存の問い合わせ一覧ページ（`/helpdesk/inquiries`）の表示順序が変更されていないことを確認する
  - 観測可能な完了条件: 上記3項目の確認結果に問題がない、または発見した問題が修正済みであることが記録される
  - _Requirements: 4.6, 5.6, 6.7_

- [x] 11. カードラベルの分かりやすさ改善（2026-07-07 追記）
  - `messages/ja.json` の `nav.inquiryForm`・`dashboard.inquiryForm.title` を「申請」、`nav.faq`・`dashboard.faq.title`・`helpdeskNav.faq`・`helpdeskDashboard.faq.title` を「よくある質問」、`helpdeskDashboard.inquiryForm.title` を「申請フォーム」に変更する
  - 英語ロケール（`messages/en.json`）は既存ラベル（New Inquiry / FAQ / Inquiry Form）で区別が明確なため変更しない
  - 観測可能な完了条件: 申請者側・ヘルプデスク側の両ダッシュボードと両サイドバーで、日本語表示が「申請」「よくある質問」「申請フォーム」に変わり、英語表示は従来通りで、コンソールエラーがないこと（playwright実機確認済み）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Boundary: messages/ja.json, messages/en.json_

- [x] 12. 両ダッシュボードへの「ドキュメント」カード追加（2026-07-08 追記）
  - `messages/ja.json` / `messages/en.json` に `dashboard.documents.{title,description}` / `helpdeskDashboard.documents.{title,description}` を追加する
  - 申請者側トップページに「お知らせ」カードの後・「リンク」カードの前の位置で「ドキュメント」カード（href `/documents`, icon `FolderOpen`）を追加する
  - ヘルプデスク側トップページ「対応業務」セクションに「お知らせ管理」カードの後の位置で「ドキュメント管理」カード（href `/helpdesk/documents`, icon `FolderOpen`）を追加する
  - 観測可能な完了条件: 両ダッシュボードにドキュメント関連カードが表示され、クリックでそれぞれ `/documents` / `/helpdesk/documents` へ遷移する。日本語・英語の両方でカード文言が正しく表示される
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - _Boundary: ApplicantDashboardPage, HelpdeskDashboardPage_

- [x] 13. 申請者側ダッシュボードへのリマインド強調表示セクション追加（2026-07-08 その2 追記）
  - `messages/ja.json` / `messages/en.json` に `dashboard.reminderAnnouncements.*`（見出し等の表示文言）を追加する
  - `ReminderAnnouncementsPanel` コンポーネントを新規実装する。自社スコープの `getAnnouncements()` 全件を取得し、既存の `isReminderPendingForCompany()` で自社宛に未対応のままリマインドが送信されているお知らせのみに絞り込み、既存の `AnnouncementListItem`（`isReminderPending=true`固定）で一覧表示する
  - 対象が0件、またはデータ取得・判定処理に失敗した場合は何も描画しない（`null`を返す）
  - 他のプレビューパネルと視覚的に区別できるよう、警告色系のアクセント（DAISOブランドトークン経由）をCardに付与する
  - 申請者側トップページ（`ApplicantDashboardPage`）のナビゲーションカード群と `AnnouncementsPreviewPanel` の間に、独立した`Suspense`境界（fallback: `null`）で配置する
  - 観測可能な完了条件: 単体テストで、リマインド対象が存在する場合の一覧表示・0件時の非表示・データ取得失敗時の非表示フォールバックの3パターンが検証できる。日本語・英語両方でセクション見出しが正しく表示される
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - _Boundary: ReminderAnnouncementsPanel, ApplicantDashboardPage_

- [x] 14. プレビューパネルの表示順反転（2026-07-09 追記）
  - `ApplicantDashboardPage` の表示順を「`ReminderAnnouncementsPanel` → `AnnouncementsPreviewPanel` → ナビゲーションカードグリッド」に変更する
  - `HelpdeskDashboardPage` の表示順を「`PriorityInquiriesPreviewPanel` → 対応業務セクション → 参考情報セクション」に変更する
  - 観測可能な完了条件: 両ポータルのトップページで、プレビューパネル（および申請者側のリマインドセクション）がナビゲーションカードより上に表示される
  - _Requirements: 4.6_
  - _Boundary: ApplicantDashboardPage, HelpdeskDashboardPage_

- [x] 15. お知らせプレビューの表示内容充実（2026-07-09 追記）
  - `AnnouncementListItem` に任意prop `showBodyExcerpt` を追加し、`true` 指定時にタイトルとバッジ行の間へ `announcement.body` を `line-clamp-2` で表示する。既存の呼び出し元（一覧ページ等）は未指定のままとし、見た目に影響を与えない
  - `AnnouncementsPreviewPanel` / `ReminderAnnouncementsPanel` から `AnnouncementListItem` へ `showBodyExcerpt`、既存の翻訳キー（`announcements.actionRequiredBadge` / `announcements.dueDateLabel`）を用いた `actionRequiredBadgeLabel` / `dueDateLabel` を渡す
  - `AnnouncementsPreviewPanelSkeleton` に本文要約分のスケルトン行を追加する
  - 観測可能な完了条件: 単体テストで、`showBodyExcerpt` 指定時に本文が2行までクランプ表示され、未指定時（既存呼び出し）は表示されないことを検証できる。ダッシュボードの両セクションで対応要否バッジ・対応期限が表示されることを検証できる
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - _Boundary: AnnouncementListItem, AnnouncementsPreviewPanel, ReminderAnnouncementsPanel_

---

## 追加ラウンド（2026-07-15）: プレビューパネル名称・リンク文言の表示名変更の反映確認

- [x] 16. 別ブランチ（`chore/rename-inquiry-to-application-labels`）で実装済みの表示文言変更が本specの対象範囲に反映されていることを確認する
  - ヘルプデスク側ダッシュボードの`dashboard.priorityInquiriesPreview.title`が「対応が必要な申請」、`.viewAll`が「申請一覧を見る」表記になっていることを`messages/ja.json`で確認する
  - パネルが扱うデータ（対象条件・最大件数・並び順・エラー処理等）に変更がないことを確認する
  - _Requirements: 11.1（更新）, 11.2（更新）_

---

## 追加ラウンド（2026-07-22）: お知らせ系プレビューパネルのUIロケール反映

- [ ] 17. 統合: お知らせ系プレビューパネルへのUIロケール引き渡し
- [ ] 17.1 `AnnouncementsPreviewPanel` の取得呼び出しに`locale`を渡す
  - `getRecentAnnouncements({ limit: PREVIEW_LIMIT })` を `getRecentAnnouncements({ limit: PREVIEW_LIMIT, locale })` に変更する（`locale`は既存の`getLocale()`結果を利用。新たな取得は不要）
  - レイアウト・件数・並び順・空状態・エラー処理・本文要約・バッジ表示は変更しない
  - _Requirements: 12.1, 12.3, 12.4_
  - _Boundary: AnnouncementsPreviewPanel_
- [ ] 17.2 `ReminderAnnouncementsPanel` の取得呼び出しに`locale`を渡す
  - `getAnnouncements()` を `getAnnouncements({ locale })` に変更する（`locale`は既存の`getLocale()`結果を利用）
  - リマインド対象抽出ロジック・0件非表示・失敗時非表示の挙動は変更しない
  - _Requirements: 12.2, 12.3, 12.4_
  - _Boundary: ReminderAnnouncementsPanel_

- [ ] 18. 検証: 単体テスト更新・実機確認
- [ ] 18.1 (P) プレビューパネルのロケール引き渡しの単体テストを更新する
  - `AnnouncementsPreviewPanel`のテストで`getRecentAnnouncements`が`{ limit, locale }`付きで呼ばれること、`ReminderAnnouncementsPanel`のテストで`getAnnouncements`が`{ locale }`付きで呼ばれることを検証する
  - 既存の正常表示・空状態・エラー時フォールバック・0件非表示のテストが引き続き通ることを確認する
  - _Requirements: 12.1, 12.2, 12.4_
  - _Depends: 17.1, 17.2_
- [ ] 18.2 英語ロケールでのダッシュボード／一覧の表示一致を実機確認する
  - UIロケールを`en`に切り替え、ダッシュボードのお知らせ系プレビューと一覧ページで同一お知らせのタイトル・本文が一致することをブラウザで確認する
  - _Requirements: 12.5_
  - _Depends: 17.1, 17.2_

- [ ] 19. ヘルプデスクダッシュボードに未対応件数KPIを追加する（2026-07-22 追記 / 要件13）
  - `UnresolvedInquiriesKpiPanel`（Server Component, `src/components/features/dashboard/`）を新設し、`getAllInquiries()`から未対応（`new`/`in_progress`）件数と本日受付（`createdAt`が当日）の未対応件数を算出して大きく強調表示する
  - `/helpdesk/inquiries`への導線、0件時の「未対応なし」表現、取得失敗時のパネル内エラー表示（例外非伝播）を実装する
  - `helpdesk/(dashboard)/page.tsx`の最上部（プレビューパネルの上位）に`Suspense`付きで配置し、スケルトンをフォールバックにする
  - KPIの見出し・件数ラベル・状態表現・リンク文言を`helpdeskDashboard`名前空間へ`messages/ja.json`・`messages/en.json`両方に追加する
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  - _Depends: なし_

- [ ]* 19.1 未対応件数KPIの単体テストを追加する
  - 未対応件数・本日受付件数の算出（前日/当日境界、new/in_progress以外の除外）、0件時表現、取得失敗時エラー表示を検証する
  - _Requirements: 13.1, 13.2, 13.4, 13.6_
  - _Depends: 19_

- [ ] 20. ヘルプデスクダッシュボードに「販社管理」カードを追加する（2026-07-22 追記 / 要件14）
  - `helpdesk/(dashboard)/page.tsx`の「対応業務（support）」セクションに`NavigationCard`（`title={nav("companies")}`, `icon={Building2}`, `href="/helpdesk/companies"`, `description={t("companies.description")}`）を追加する
  - `helpdeskDashboard.companies.description`を`messages/ja.json`・`messages/en.json`両方に追加する
  - 既存カード・順序・KPI・プレビューパネルに影響を与えないことを確認する
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - _Depends: なし_
