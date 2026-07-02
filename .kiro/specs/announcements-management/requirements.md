# Requirements Document

## Project Description (Input)
ヘルプデスク側のお知らせ管理機能。日本側ヘルプデスク担当者が、海外販社向けのお知らせを作成・編集・削除できる画面を、既存の`helpdesk-portal-layout`spec（`.kiro/specs/helpdesk-portal-layout/`）が確立したヘルプデスク側ルートセグメント・レイアウトの上に実装する。

背景: 既存の`announcements`spec（`.kiro/specs/announcements/`）は申請者側（海外販社担当者）向けのお知らせ一覧・詳細の閲覧機能のみを対象としており、「ヘルプデスク担当者向けのお知らせ作成・編集・削除機能」は明示的に対象外とされている。本specはこの対象外とされていた機能を実装する。壁打ちにより、配信対象を国・地域単位で指定できるようにすることが既に決まっている。

要件:
- ヘルプデスク側にお知らせ管理画面（一覧・新規作成・編集・削除）を新設する
- お知らせの項目はタイトル・本文・種別（既存の`maintenance`/`policy`/`incident`/`other`を流用）・公開日に加え、配信対象を国・地域単位で指定できるようにする（`Announcement`型の拡張が必要）
- 配信対象の指定は「全体一律」または「特定の国・地域のみ」を選べるようにする
- 配信対象の指定を実際に機能させるため、既存の申請者側のお知らせ一覧・詳細・ダッシュボードウィジェット（`announcements`・`dashboard`spec所有）が、配信対象に自社の国が含まれるお知らせ（または全体一律のお知らせ）のみを表示するようフィルタする対応を含む。フィルタの基準となる「自社の国」は、`helpdesk-inquiry-management`specで導入した自社スコープの考え方（固定のモック会社・国）を踏襲する
- ヘルプデスク側の変更系操作は、`helpdesk-inquiry-management`specで確立したパターン（Server Actions + `globalThis`ベースの共有モックストア + サーバー側バリデーション）を踏襲する
- `HelpdeskSidebar`にお知らせ管理へのナビゲーション項目を追加する
- 既存の申請者側のお知らせ一覧・詳細画面のレイアウト・操作性自体は変更しない（表示される件数がフィルタにより変わる点を除く）

スコープ外:
- 認証・ロールベースアクセス制御（フェーズ3以降）
- お知らせの既読・未読管理
- メール・プッシュ通知等の配信機能
- ヘルプデスク問い合わせ管理・テンプレート管理機能自体の変更（別spec `helpdesk-inquiry-management` で実装済み）

## Introduction

本仕様は、`helpdesk-portal-layout`specが確立したヘルプデスク側のルーティング・レイアウトの上に、既存の`announcements`specが対象外としていたヘルプデスク側のお知らせ作成・編集・削除機能を実装する。あわせて、お知らせごとに配信対象を国・地域単位で指定できるようにし、申請者側の閲覧画面がその配信対象に応じてフィルタされるようにすることで、機能全体を意味のある形で完結させる。

## Boundary Context

- **In scope**: ヘルプデスク側お知らせ管理画面（一覧・新規作成・編集・削除）、`Announcement`型への配信対象フィールドの追加、申請者側の読み取り関数（`getAnnouncements`・`getRecentAnnouncements`・`getAnnouncementById`）への配信対象フィルタの適用、`HelpdeskSidebar`へのナビゲーション項目追加
- **Out of scope**: 認証・ロールベースアクセス制御、お知らせの既読・未読管理、メール・プッシュ通知等の配信機能、`helpdesk-inquiry-management`（問い合わせ管理・テンプレート管理）機能自体の変更、`helpdesk-portal-layout`が確立したルートセグメント・レイアウト構造自体の変更
- **Adjacent expectations**: 既存の`announcements`spec・`dashboard`spec所有のコンポーネント（`AnnouncementList`・`AnnouncementDetail`・`AnnouncementWidget`）は、参照するデータの範囲（配信対象によるフィルタ）が変わるが、レイアウト・見た目・操作性は変更しない。ヘルプデスク側の変更系操作は、`helpdesk-inquiry-management`specが確立したパターン（Server Actions・共有モックストア・サーバー側バリデーション）を踏襲する前提とする

## Requirements

### Requirement 1: ヘルプデスク側お知らせ一覧の表示
**Objective:** As a ヘルプデスク担当者, I want 登録済みのお知らせを一覧で確認できる, so that 配信状況を把握し、編集・削除の対象を選べる

#### Acceptance Criteria
1. The Portal shall ヘルプデスク側にお知らせ管理画面を提供し、登録済みの全てのお知らせを公開日の降順で一覧表示する。
2. The Portal shall 一覧の各項目にタイトル・種別・公開日・配信対象（全体一律または対象国名）を表示する。
3. While データを読み込み中のとき、the Portal shall 一覧領域にローディング状態を表示する。
4. If データの取得に失敗したとき、the Portal shall エラーメッセージを表示する。
5. If お知らせが1件も存在しないとき、the Portal shall 「お知らせはありません」旨のメッセージを表示する。
6. The Portal shall 一覧から新規作成画面・各お知らせの編集画面への導線を提供する。

### Requirement 2: お知らせの新規作成
**Objective:** As a ヘルプデスク担当者, I want 新しいお知らせを作成できる, so that 海外販社へ周知事項を伝えられる

#### Acceptance Criteria
1. The Portal shall お知らせ新規作成画面に、タイトル・本文・種別・配信対象を入力するフォームを提供する。
2. If タイトル・本文・種別のいずれかが未入力のとき、the Portal shall 保存操作をブロックし入力を促す。
3. When ユーザーが必要項目を入力して保存したとき、the Portal shall 新しいお知らせを登録し、お知らせ管理一覧に反映する。
4. The Portal shall 新規作成時の公開日を保存操作を行った日時とする。

### Requirement 3: お知らせの編集
**Objective:** As a ヘルプデスク担当者, I want 既存のお知らせの内容を編集できる, so that 誤りの訂正や内容の更新ができる

#### Acceptance Criteria
1. The Portal shall 既存のお知らせを選択すると、現在の内容が初期表示された編集フォームを表示する。
2. If タイトル・本文・種別のいずれかが未入力のまま保存しようとしたとき、the Portal shall 保存操作をブロックし入力を促す。
3. When ユーザーが編集内容を保存したとき、the Portal shall 変更内容をお知らせ管理一覧・申請者側の表示に反映する。
4. If URLに存在しないお知らせIDが指定されたとき、the Portal shall お知らせが見つからない旨のメッセージを表示する。

### Requirement 4: お知らせの削除
**Objective:** As a ヘルプデスク担当者, I want 不要になったお知らせを削除できる, so that 一覧を最新の状態に保てる

#### Acceptance Criteria
1. The Portal shall お知らせ管理一覧または編集画面から、お知らせを削除する操作を提供する。
2. When ユーザーが削除操作を確定したとき、the Portal shall 対象のお知らせを削除し、お知らせ管理一覧・申請者側の表示から除去する。
3. The Portal shall 削除操作の実行前に、誤操作を防ぐための確認を求める。

### Requirement 5: 配信対象（国・地域）の指定
**Objective:** As a ヘルプデスク担当者, I want お知らせごとに配信対象を国・地域単位で指定できる, so that 関係する販社にのみ的確に情報を届けられる

#### Acceptance Criteria
1. The Portal shall お知らせの作成・編集フォームに、配信対象を「全体一律」または「特定の国・地域を1つ以上指定」のいずれかから選択できる操作を提供する。
2. If 「特定の国・地域を指定」を選択したとき、the Portal shall 既存の国コード一覧（`inquiryForm`の国選択肢）から1つ以上の国を選択できるようにする。
3. If 「特定の国・地域を指定」を選択したにもかかわらず1件も国が選択されていない状態で保存しようとしたとき、the Portal shall 保存操作をブロックし入力を促す。
4. The Portal shall 配信対象の指定内容をお知らせのデータとして保存する。

### Requirement 6: 申請者側での配信対象フィルタの適用
**Objective:** As a 海外販社担当者, I want 自社に関係するお知らせのみを確認したい, so that 関係のない地域向けの情報に惑わされない

#### Acceptance Criteria
1. The Portal shall 申請者側のお知らせ一覧・ダッシュボードウィジェットに、配信対象が「全体一律」のお知らせと、配信対象に自社の国が含まれるお知らせのみを表示する。
2. The Portal shall 申請者側のお知らせ詳細画面について、配信対象外のお知らせIDが指定されたとき、お知らせが見つからない旨のメッセージを表示する。
3. The Portal shall 本要件によるフィルタ適用後も、既存の申請者側画面のレイアウト・操作性（並び順・空状態・エラー表示等）を変更しない。

### Requirement 7: ヘルプデスク側ナビゲーションへの統合
**Objective:** As a ヘルプデスク担当者, I want サイドバーからお知らせ管理へ直接アクセスできる, so that 目的の画面にすぐ到達できる

#### Acceptance Criteria
1. The Portal shall `HelpdeskSidebar`のナビゲーション項目に、お知らせ管理画面への項目を追加する。
2. The Portal shall 追加した項目について、現在表示中のページに対応する項目をアクティブ状態で強調表示する。

### Requirement 8: 多言語対応（i18n）
**Objective:** As a ヘルプデスク担当者, I want お知らせ管理画面を日本語・英語で利用できる, so that 既存のポータルと同様に言語を切り替えて利用できる

#### Acceptance Criteria
1. The Portal shall 本specで追加する全ての画面・UI文字列を`next-intl`の翻訳キー経由で提供し、`messages/ja.json`・`messages/en.json`で管理する。
2. When 選択された言語の翻訳キーが存在しないとき、the Portal shall 既存と同様に英語（`en`）にフォールバックして表示する。

### Requirement 9: レスポンシブ対応
**Objective:** As a ヘルプデスク担当者, I want タブレット幅の端末からもお知らせ管理画面を問題なく利用できる, so that PC以外の環境でも業務を継続できる

#### Acceptance Criteria
1. The Portal shall 本specで追加する画面をタブレット幅（768px以上）のビューポートで横スクロールを発生させることなく表示する。
