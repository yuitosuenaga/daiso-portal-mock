# Requirements Document

## Project Description (Input)
helpdesk-account-management: ヘルプデスク担当者が海外販社（Company）とその申請者アカウント（ApplicantUser）を管理する画面。Companyの一覧・新規作成・編集、および会社ごとのApplicantUser（申請者アカウント）の一覧・新規作成・編集・無効化ができる。新規ApplicantUser作成時はヘルプデスク担当者がパスワードを直接設定する運用（フェーズ1〜3の間はメール送信基盤が無いため）。ヘルプデスク側画面のため、既存のhelpdesk-links/helpdesk-faq/helpdesk-templates/helpdesk-documents等と同様のヘルプデスク側specとして作成する。画面ルートは/helpdesk/companies配下等、既存ヘルプデスク管理画面と一貫性のある構成にする。認可はヘルプデスクセッションのみ。表示テキストはnext-intl経由で日本語・英語両対応。

## はじめに

現在、`Company`（海外販社）・`ApplicantUser`（申請者アカウント）は`prisma/schema.prisma`に定義済みでフェーズ3のDB実装に含まれているが、これらを投入・更新する手段は`prisma/seed.ts`（900行超）の直接編集しかなく、ヘルプデスク側にCRUD画面が存在しない。20か国以上の販社を実運用に乗せていく上で、担当者の追加・異動・退職のたびにエンジニアがseedスクリプトやSQLを直接編集する運用は継続できない。

本仕様は、`helpdesk-portal-layout`specが確立したヘルプデスク側のルーティング・レイアウト・ルート保護（`/helpdesk/*`配下はヘルプデスクセッションのみアクセス可）の上に、ヘルプデスク担当者が海外販社（`Company`）とその申請者アカウント（`ApplicantUser`）を一覧・新規作成・編集し、退職・異動等で不要になったアカウントを無効化できる管理画面を新設するものである。既存のヘルプデスク管理画面（`helpdesk-links`・`helpdesk-faq`・`helpdesk-templates`・`helpdesk-documents`等）が確立したCRUD実装パターン（Server Component一覧ページ＋Server Actions＋zodバリデーション＋react-hook-form、`revalidatePath`によるキャッシュ再検証）を踏襲する。

## スコープ境界

- **対象**: ヘルプデスク側の販社管理画面（`Company`の一覧・新規作成・編集）、会社ごとの申請者アカウント管理画面（`ApplicantUser`の一覧・新規作成・編集・無効化／再有効化）、新規`ApplicantUser`作成時のヘルプデスク担当者によるパスワード直接設定、既存パスワードの再設定（ヘルプデスク担当者による直接変更）、ルート`/helpdesk/companies`配下の新規ページ群、`HelpdeskSidebar`へのナビゲーション項目追加、対応するServer Actions・zodバリデーションスキーマ・データアクセス関数の設計、無効化されたアカウントのログイン拒否という認証側への影響範囲の定義。
- **対象外**: 実際のメール送信によるパスワードリセット・アカウント招待メール（メール送信基盤が存在しないため将来フェーズで対応）、多要素認証（MFA）、CSVインポート等の一括登録・一括無効化（将来検討）、`ApplicantUser`の物理削除（既存の`Inquiry.companyId`・`AnnouncementRecipient.companyId`等の外部キー参照整合性の観点から無効化のみを対象とし削除機能は設けない）、`Company`の削除・無効化（既存の申請者アカウント・問い合わせ等の参照元となるため本specでは対象外とし、将来要件として扱う）、`HelpdeskStaff`（ヘルプデスク担当者自身のアカウント）の管理画面（別画面・別ユーザー種別であり本specの対象外）、ログイン画面自体の変更（既存の`/helpdesk/login`・`/login`の実装は変更しない。無効化されたアカウントのログイン拒否ロジックの追加のみが本specの対象）。
- **隣接仕様との境界**: `helpdesk-portal-layout`specが確立した`HelpdeskSidebar`・ルート保護（ミドルウェアによる`/helpdesk/*`配下のヘルプデスクセッション必須化）の仕組みをそのまま利用し、本spec側で新たなルート保護の仕組みを作らない。認証（Auth.js Credentials Provider、`src/lib/server/authorize.ts`）は既存実装を前提とし、本specは「無効化されたアカウントでの認証を拒否する」という認可判定への追加要件のみを持つ。既存の`src/lib/server/company-service.ts`（`listCompaniesForHelpdesk`、ヘルプデスク側代理問い合わせ登録画面向けの`Company`読み取り専用関数）は`helpdesk-inquiry-management`spec所有のまま変更せず、本specは`Company`の書き込み系（作成・更新）とより詳細な読み取り（一覧・詳細）を新たに設計する。
- **隣接仕様との境界（`AnnouncementRecipient`。2026-07-17 追記）**: `AnnouncementRecipient`（お知らせの確認済み・実施済み・リマインド送信状態を追跡する会社単位のマスタ）は`announcements-management`・`announcements`・`backend-db-foundation`specが所有する。本specは、`Company`を新規作成した瞬間から当該会社がお知らせトラッキングの対象になるよう、`Company`作成時に対応する`AnnouncementRecipient`を同期生成する部分（および過去に本spec経由で作成され`AnnouncementRecipient`が欠落している`Company`の補完）のみを担当する。`AnnouncementRecipient`の型定義（`src/types/announcement-recipient.ts`）・Prismaスキーマ定義・トラッキング/自己申告/リマインド送信のロジック（`announcement-service.ts`等）は本specの対象外であり、変更しない。
- **スコープ拡張（セッション即時失効。2026-07-21 追記）**: 要件7.5「無効化された`ApplicantUser`のログイン拒否」は元々ログイン試行時のみを対象としていたが、本追記により「ログイン済みセッションの即時失効」（要件15）を対象に加える。認証の主要実装（`src/auth.config.ts`・`src/auth.ts`・`src/lib/server/authorize.ts`、Auth.js Credentials Provider）自体は変更せず、セッション参照層（`src/lib/server/get-session.ts`・`src/lib/server/auth-session.ts`）と申請者側レイアウト（`src/app/[locale]/(applicant)/layout.tsx`）への追加のみを行う。

## 要件

### 要件 1: 販社（Company）一覧の表示

**目的:** ヘルプデスク担当者として、登録済みの海外販社を一覧で確認したい。そうすることで、対象の会社を選んで詳細確認や編集、申請者アカウント管理に進める。

#### 受け入れ基準

1. The ヘルプデスクポータル shall ヘルプデスク側に販社管理画面（`/helpdesk/companies`）を提供し、登録済みの全ての`Company`を会社名の昇順で一覧表示する。
2. The ヘルプデスクポータル shall 一覧の各項目に会社名・国・販社コード（`companyCode`）・所属する申請者アカウント数を表示する。
3. The ヘルプデスクポータル shall 一覧に会社名・販社コードによる検索（絞り込み）操作を提供する。
4. While データを読み込み中のとき、the ヘルプデスクポータル shall 一覧領域にローディング状態（スケルトンUI）を表示する。
5. If データの取得に失敗したとき、the ヘルプデスクポータル shall 一覧領域にエラーメッセージを表示する。
6. If 登録済みの`Company`が1件も存在しないとき、the ヘルプデスクポータル shall 「販社が登録されていません」旨のメッセージを表示する。
7. The ヘルプデスクポータル shall 一覧から新規作成画面（`/helpdesk/companies/new`）・各会社の詳細画面（`/helpdesk/companies/[id]`）への導線を提供する。

---

### 要件 2: 販社（Company）の新規作成

**目的:** ヘルプデスク担当者として、新しい海外販社を登録したい。そうすることで、新規に契約した代理店・販社の担当者にポータルを利用してもらえる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 販社新規作成画面（`/helpdesk/companies/new`）に、会社名・国・販社コード（`companyCode`）を入力するフォームを提供する。
2. If 会社名・国・販社コードのいずれかが未入力のまま保存しようとしたとき、the ヘルプデスクポータル shall 保存操作をブロックし入力を促す。
3. If 入力された販社コードが既存の`Company`の販社コードと重複するとき、the ヘルプデスクポータル shall 保存操作をブロックし重複エラーを表示する。
4. When ユーザーが必要項目を入力して保存したとき、the ヘルプデスクポータル shall 新しい`Company`を登録し、販社管理一覧に反映する。
5. The ヘルプデスクポータル shall 販社コードの重複検証をクライアント側の入力時とServer Actionsによるサーバー側保存時の両方で行う。

---

### 要件 3: 販社（Company）の編集

**目的:** ヘルプデスク担当者として、登録済みの海外販社の情報を編集したい。そうすることで、社名変更や登録内容の誤りを訂正できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 既存の`Company`を選択すると、現在の内容（会社名・国・販社コード）が初期表示された編集画面（`/helpdesk/companies/[id]/edit`）を表示する。
2. If 会社名・国・販社コードのいずれかが未入力のまま保存しようとしたとき、the ヘルプデスクポータル shall 保存操作をブロックし入力を促す。
3. If 編集後の販社コードが自分自身以外の既存`Company`の販社コードと重複するとき、the ヘルプデスクポータル shall 保存操作をブロックし重複エラーを表示する。
4. When ユーザーが編集内容を保存したとき、the ヘルプデスクポータル shall 変更内容を販社管理一覧・詳細画面に反映する。
5. If URLに存在しない`Company`のIDが指定されたとき、the ヘルプデスクポータル shall 会社が見つからない旨のメッセージを表示する。

---

### 要件 4: 販社詳細画面と申請者アカウント一覧の表示

**目的:** ヘルプデスク担当者として、特定の販社に所属する申請者アカウントを一覧で確認したい。そうすることで、担当者の追加・異動・退職に応じたアカウント管理を行える。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 販社詳細画面（`/helpdesk/companies/[id]`）に、当該`Company`の会社名・国・販社コードと、所属する`ApplicantUser`の一覧を表示する。
2. The ヘルプデスクポータル shall 申請者アカウント一覧の各項目にメールアドレス・表示名・有効状態（有効／無効）を表示する。
3. The ヘルプデスクポータル shall 申請者アカウント一覧を、有効なアカウントが先頭に表示される順序（有効状態、表示名昇順）で表示する。
4. If 当該`Company`に所属する`ApplicantUser`が1件も存在しないとき、the ヘルプデスクポータル shall 「申請者アカウントが登録されていません」旨のメッセージを表示する。
5. The ヘルプデスクポータル shall 販社詳細画面から、当該会社の編集画面（`/helpdesk/companies/[id]/edit`）・申請者アカウント新規作成画面（`/helpdesk/companies/[id]/applicant-users/new`）・各申請者アカウントの編集画面への導線を提供する。
6. If URLに存在しない`Company`のIDが指定されたとき、the ヘルプデスクポータル shall 会社が見つからない旨のメッセージを表示する。

---

### 要件 5: 申請者アカウント（ApplicantUser）の新規作成とパスワード直接設定

**目的:** ヘルプデスク担当者として、新しい申請者アカウントを作成し、初期パスワードを直接設定したい。そうすることで、メール送信基盤が無いフェーズ1〜3の間も新規担当者にログイン情報を案内できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 申請者アカウント新規作成画面（`/helpdesk/companies/[id]/applicant-users/new`）に、メールアドレス・表示名・初期パスワードを入力するフォームを提供する。
2. If メールアドレス・表示名・初期パスワードのいずれかが未入力のまま保存しようとしたとき、the ヘルプデスクポータル shall 保存操作をブロックし入力を促す。
3. If 入力されたメールアドレスが既存の`ApplicantUser`（または`HelpdeskStaff`）のメールアドレスと重複するとき、the ヘルプデスクポータル shall 保存操作をブロックし重複エラーを表示する。
4. If 入力されたメールアドレスの形式が不正なとき、the ヘルプデスクポータル shall 保存操作をブロックし形式エラーを表示する。
5. If 入力された初期パスワードが最小文字数要件（8文字以上）を満たさないとき、the ヘルプデスクポータル shall 保存操作をブロックし入力を促す。
6. When ユーザーが必要項目を入力して保存したとき、the ヘルプデスクポータル shall 入力された初期パスワードをハッシュ化（既存の`bcryptjs`によるハッシュ方式）した上で新しい`ApplicantUser`を作成し、指定した`Company`に紐付ける。
7. The ヘルプデスクポータル shall 新規作成された`ApplicantUser`を初期状態で有効なアカウントとする。
8. The ヘルプデスクポータル shall メールアドレス重複・形式の検証をクライアント側の入力時とServer Actionsによるサーバー側保存時の両方で行う。
9. The ヘルプデスクポータル shall 保存操作の完了後、入力されたパスワードの平文をフォーム・画面上に残さない。

---

### 要件 6: 申請者アカウント（ApplicantUser）の編集とパスワード再設定

**目的:** ヘルプデスク担当者として、既存の申請者アカウントの情報を編集し、必要に応じてパスワードを再設定したい。そうすることで、担当者の異動やパスワード忘れの問い合わせに対応できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 既存の`ApplicantUser`を選択すると、現在の内容（メールアドレス・表示名）が初期表示された編集画面（`/helpdesk/companies/[id]/applicant-users/[userId]/edit`）を表示する。
2. If メールアドレスまたは表示名が未入力のまま保存しようとしたとき、the ヘルプデスクポータル shall 保存操作をブロックし入力を促す。
3. If 編集後のメールアドレスが自分自身以外の既存`ApplicantUser`（または`HelpdeskStaff`）のメールアドレスと重複するとき、the ヘルプデスクポータル shall 保存操作をブロックし重複エラーを表示する。
4. The ヘルプデスクポータル shall 編集画面に、新しいパスワードを直接設定するための任意入力欄を提供する。
5. While パスワード入力欄が空欄のまま保存されたとき、the ヘルプデスクポータル shall 既存のパスワードハッシュを変更せず他の項目のみ更新する。
6. If パスワード入力欄に入力があり最小文字数要件（8文字以上）を満たさないとき、the ヘルプデスクポータル shall 保存操作をブロックし入力を促す。
7. When ユーザーがパスワード入力欄に新しいパスワードを入力して保存したとき、the ヘルプデスクポータル shall 入力された新しいパスワードをハッシュ化した上で保存し、以後のログインに新しいパスワードを要求する。
8. When ユーザーが編集内容を保存したとき、the ヘルプデスクポータル shall 変更内容を販社詳細画面の申請者アカウント一覧に反映する。
9. If URLに存在しない`ApplicantUser`のIDが指定されたとき、the ヘルプデスクポータル shall アカウントが見つからない旨のメッセージを表示する。

---

### 要件 7: 申請者アカウント（ApplicantUser）の無効化・再有効化

**目的:** ヘルプデスク担当者として、退職・異動した担当者のアカウントを無効化したい。そうすることで、既存の問い合わせ・お知らせ既読等の履歴データを保持しつつ不要なアカウントのログインを止められる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 販社詳細画面の申請者アカウント一覧・編集画面から、当該`ApplicantUser`を無効化する操作を提供する。
2. The ヘルプデスクポータル shall 無効化操作の実行前に、誤操作を防ぐための確認を求める。
3. When ユーザーが無効化操作を確定したとき、the ヘルプデスクポータル shall 対象の`ApplicantUser`を無効状態に変更し、レコード自体は削除しない。
4. The ヘルプデスクポータル shall 無効状態の`ApplicantUser`を、既存の問い合わせ（`Inquiry`）・お知らせ既読状況（`AnnouncementRecipientStatus`）等の履歴データの参照元として保持し続ける。
5. If 無効状態の`ApplicantUser`がログインを試みたとき、the ヘルプデスクポータル shall 認証を拒否しログイン失敗として扱う。
6. The ヘルプデスクポータル shall 販社詳細画面の申請者アカウント一覧・編集画面から、無効化されたアカウントを再有効化する操作を提供する。
7. When ユーザーが再有効化操作を確定したとき、the ヘルプデスクポータル shall 対象の`ApplicantUser`を有効状態に戻し、以後のログインを許可する。

---

### 要件 8: 認可（ヘルプデスクセッション限定）

**目的:** ヘルプデスク担当者として、販社・申請者アカウントという機密性の高い情報の管理画面を自分たちだけが利用できることを確認したい。そうすることで、申請者側ユーザーによる不正な閲覧・操作を防げる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 本specで追加する全ての画面（`/helpdesk/companies`配下）を、既存のルート保護（ミドルウェアによるヘルプデスクセッション必須化）の対象とする。
2. The ヘルプデスクポータル shall 本specで追加する全てのServer Actions・データアクセス関数について、呼び出し時にヘルプデスクセッションを検証し（多層防御）、検証に失敗した場合は処理を行わずエラーとする。
3. If ヘルプデスクセッションを持たないユーザーが本specの画面URLへ直接アクセスしたとき、the ヘルプデスクポータル shall ヘルプデスクログイン画面（`/helpdesk/login`）へリダイレクトする。

---

### 要件 9: ヘルプデスク側ナビゲーションへの統合

**目的:** ヘルプデスク担当者として、サイドバーから販社・申請者アカウント管理へ直接アクセスしたい。そうすることで、目的の画面にすぐ到達できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall `HelpdeskSidebar`のナビゲーション項目に、販社管理画面への項目を追加する。
2. The ヘルプデスクポータル shall 追加した項目について、現在表示中のページに対応する項目をアクティブ状態で強調表示する。

---

### 要件 10: 多言語対応（i18n）

**目的:** ヘルプデスク担当者として、販社・申請者アカウント管理画面を日本語・英語で利用したい。そうすることで、既存のポータルと同様に言語を切り替えて利用できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 本specで追加する全ての画面・UI文字列（見出し・ラベル・ボタン・エラーメッセージ・確認ダイアログ）を`next-intl`の翻訳キー経由で提供し、`messages/ja.json`・`messages/en.json`で管理する。
2. When 選択された言語の翻訳キーが存在しないとき、the ヘルプデスクポータル shall 英語（`en`）にフォールバックして表示する。

---

### 要件 11: レスポンシブ対応

**目的:** ヘルプデスク担当者として、タブレット幅の端末からも販社・申請者アカウント管理画面を問題なく利用したい。そうすることで、PC以外の環境でも業務を継続できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 本specで追加する画面をタブレット幅（768px以上）のビューポートで横スクロールを発生させることなく表示する。

---

## 追加要望: `Company`作成時の`AnnouncementRecipient`同期（2026-07-17 追記）

### 背景（バグ）

`helpdesk-account-management`spec 導入前、`Company`は`prisma/seed.ts`でのみ投入され、seedは各`Company`に対応する`AnnouncementRecipient`（お知らせの確認済み・実施済み状態やリマインド送信対象を追跡する会社単位のマスタ）を同時に作成していた。しかし本specで新設した管理画面経由の`Company`作成フロー（`src/lib/server/company-service.ts`の`createCompany`）は`AnnouncementRecipient`を一切生成しない。その結果、管理画面から新規登録した販社は、`AnnouncementRecipient`を`companyCode`で引くお知らせ関連処理（`recordCompanyConfirmation`/`recordCompanyCompletion`等）の対象が0件となり、以下の不具合が発生する。

- お知らせの「確認済み／実施済み」自己申告ボタンを押しても対象0件で何も記録されない
- ヘルプデスク側のお知らせトラッキング画面（宛先一覧）に当該販社が一切現れない
- ヘルプデスク側トラッキング画面からのリマインド送信対象（選択候補）にも当該販社の担当者が現れない

新規販社をオンボーディングした瞬間に壊れる実質的なバグであり、本specが所有する`Company`作成フローに起因するため、本specの追加要件として修正する。

### 要件 12: `Company`新規作成時の`AnnouncementRecipient`同期生成

**目的:** ヘルプデスク担当者として、管理画面から新規登録した販社が、登録直後からお知らせのトラッキング・自己申告・リマインドの対象になるようにしたい。そうすることで、新規オンボーディングした販社でもお知らせ機能が正しく動作する。

#### 受け入れ基準

1. When ヘルプデスク担当者が販社（`Company`）を新規作成したとき、the ヘルプデスクポータル shall 当該`Company`に紐付く`AnnouncementRecipient`を少なくとも1件、同一トランザクション内で同時に作成する。
2. The ヘルプデスクポータル shall `Company`作成と`AnnouncementRecipient`作成をアトミックに扱い、いずれかが失敗した場合は両方をロールバックして`Company`のみが`AnnouncementRecipient`を欠く状態を作らない。
3. When 同期生成された`AnnouncementRecipient`について、the ヘルプデスクポータル shall `contactName`に会社を識別できる表示名（当該`Company`の会社名を既定とする）を設定する。
4. The ヘルプデスクポータル shall 同期生成した`AnnouncementRecipient`により、作成直後の`Company`が既存のお知らせトラッキング（`getAnnouncementRecipientStatuses`）・自己申告記録（`recordCompanyConfirmation`/`recordCompanyCompletion`）・リマインド送信対象の選択の対象に含まれるようにする。
5. The ヘルプデスクポータル shall `AnnouncementRecipient`の型定義・Prismaスキーマ定義・トラッキング/自己申告/リマインドのロジック自体は変更せず、`Company`作成フロー側でのレコード生成のみを追加する（`AnnouncementRecipient`は`announcements-management`/`announcements`/`backend-db-foundation`spec所有）。

### 要件 13: 既存`Company`に対する`AnnouncementRecipient`の補完（backfill）

**目的:** ヘルプデスク担当者・運用者として、本バグ修正より前に管理画面経由で作成され`AnnouncementRecipient`が欠落している既存の販社についても、お知らせ機能が正しく動作するようにしたい。そうすることで、既に壊れている販社を後追いで救済できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall `AnnouncementRecipient`を1件も持たない既存の`Company`を検出し、各社に対して`AnnouncementRecipient`を1件補完する手段を提供する。
2. The 補完手段 shall 冪等（idempotent）であり、既に`AnnouncementRecipient`を持つ`Company`には新たなレコードを追加せず、複数回実行しても重複を生じない。
3. The 補完手段 shall 補完で生成する`AnnouncementRecipient`の`contactName`を、要件12.3と同一の規則（当該`Company`の会社名を既定とする）で設定する。
4. The 補完手段 shall リポジトリ既存の運用パターン（`prisma/seed.ts`と同様の`tsx`スクリプト + `package.json`スクリプト）に沿って提供し、環境（ローカル・本番Cloud SQL等）ごとに手動実行できるものとする。
5. The 補完手段 shall 既存の`AnnouncementRecipientStatus`（確認済み・実施済み・リマインド送信履歴）を変更・削除しない。

### 要件 14: `ApplicantUser`作成時の`AnnouncementRecipient`に関する扱い

**目的:** ヘルプデスク担当者として、申請者アカウント（`ApplicantUser`）の作成が`AnnouncementRecipient`のトラッキング整合性に影響しないことを明確にしたい。そうすることで、アカウント追加のたびに余計なトラッキング対象が増減しないことを保証できる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall `ApplicantUser`の新規作成時に`AnnouncementRecipient`を生成・変更しない。
2. The ヘルプデスクポータル shall この扱いの根拠として、`AnnouncementRecipient`が`Company`に対して多対一（会社単位）のマスタであり、`ApplicantUser`とはリレーション（外部キー）を持たず`companyCode`（会社）でのみ引かれること、およびお知らせのトラッキング・自己申告・リマインド選択が会社単位で成立することを、設計に明記する。
3. The ヘルプデスクポータル shall `AnnouncementRecipient`の同期生成を`Company`作成時のみに限定し、`ApplicantUser`作成・編集・無効化・再有効化のフローでは`AnnouncementRecipient`に触れない。

---

## セキュリティ修正: 無効化された申請者アカウントのセッション即時失効（2026-07-21 追記）

### 背景（バグ）

認証はJWTセッション戦略（`session: { strategy: "jwt" }`、`src/auth.config.ts`）であり、`ApplicantUser.isActive`のチェックは要件7.5の通りログイン時（`src/lib/server/authorize.ts`）のみ行われていた。既存の`jwt`/`session`コールバックはトークンの内容を透過するだけでDB再照会を行わないため、ヘルプデスク担当者が要件7（申請者アカウントの無効化・再有効化）に基づき`ApplicantUser`を無効化しても、そのユーザーが既にログイン済みであれば、JWTの有効期限が切れるまで既存セッションで全機能へのアクセスが継続してしまう（退職者・不正利用者を即座に締め出せないセキュリティギャップ）。要件7.5は「ログインを試みたとき」の拒否のみを定めており、「ログイン済みセッションの即時失効」は本specのスコープ境界に明記されていなかったため、本追記で対象範囲を拡張する。

### 要件 15: ログイン済みセッションの即時失効（無効化後のアクセス遮断）

**目的:** ヘルプデスク担当者として、申請者アカウントを無効化した際、そのアカウントが既にログイン済みであっても、以後のアクセスを速やかに遮断したい。そうすることで、退職・異動した担当者や不正利用の疑いがあるアカウントを、JWTの有効期限切れを待たずに締め出せる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 申請者セッションが参照される都度（Server Actions・Route Handler・申請者側画面のレイアウトを含む）、対象`ApplicantUser`の`isActive`をDBへ再照会する。
2. If 参照時点で対象`ApplicantUser`の`isActive`が`false`であるとき、the ヘルプデスクポータル shall 当該セッションのクレームを無効なものとして扱い、以後のデータアクセス（Server Actions・Route Handler経由のAPI）を拒否する。
3. When 無効化された申請者アカウントの既存セッションで申請者側画面（`/[locale]/(applicant)`配下）へ次にアクセスしたとき、the ヘルプデスクポータル shall 申請者ログイン画面（`/login`）へリダイレクトする。
4. The ヘルプデスクポータル shall 本要件の再照会をJWT自体のコールバック（Edge Runtimeでも実行されるミドルウェアと共有される）ではなく、Node.jsランタイムで実行されるセッション参照処理（`getSession`・`requireApplicantSession`等）に実装し、既存のEdge Runtime対応方針（`src/auth.config.ts`の「Prisma・bcryptjsに依存する処理を含めない」制約）を変更しない。
5. The ヘルプデスクポータル shall `HelpdeskStaff`について、本specのスコープ外（要件のスコープ境界に既存記載の通り、`HelpdeskStaff`自身のアカウント管理は対象外）であり、かつ現時点で`isActive`相当のフィールドが存在しないことを踏まえ、本要件の再照会対象に含めない。将来`HelpdeskStaff`に無効化フィールドが追加された場合は別途検討する。
6. The ヘルプデスクポータル shall 再有効化された`ApplicantUser`について、再ログイン後の新規セッションで通常通りアクセスできることを妨げない（既存の要件7.7と整合する）。

---

**背景（2026-07-22 追記）: 運用UX改善（確認モーダルのアプリ内化・販社コード入力ガイド）**
2026-07-21のプロダクト全体レビューにより、本specが所有する画面で2点の運用UX課題が指摘された。(1) 申請者アカウントの無効化・再有効化の確認がブラウザ標準`window.confirm()`で行われ、対象アカウント名が確認文言に含まれずUIトーンとも不一致（要件16で解消）。(2) 販社（Company）作成フォームの`companyCode`が自由入力欄のみで、既存の命名規則（例: `vn-daiso-vietnam`）の案内や重複チェックのタイミングが不明瞭（要件17で解消）。

### 要件 16: アカウント無効化・再有効化確認のアプリ内モーダル化と対象名の明示（2026-07-22 追記）

**背景:** 現状、申請者アカウントの無効化・再有効化は`ToggleApplicantUserActiveButton`（`src/components/features/helpdesk-companies/ToggleApplicantUserActiveButton.tsx`）がブラウザ標準`window.confirm()`で確認しており、確認文言（`helpdeskCompanies.toggleActive.deactivateConfirm`/`activateConfirm`）に対象アカウント名が含まれず、どのアカウントを操作しようとしているか曖昧である。またOSネイティブダイアログのためポータルのUIトーンと不一致。`helpdesk-portal-layout`spec（要件15）が新設する共通`ConfirmDialog`でアプリ内モーダル化し、対象アカウント名を明示する。

**目的:** ヘルプデスク担当者として、アカウント無効化・再有効化の確認モーダルに対象アカウント名が明示された状態で確認したい。そうすることで、誤って別のアカウントを無効化する事故を防げる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall `ToggleApplicantUserActiveButton`の確認を、`window.confirm()`ではなく共通`ConfirmDialog`（`src/components/ui/confirm-dialog.tsx`, helpdesk-portal-layout要件15）で行う。
2. The ヘルプデスクポータル shall 確認モーダルの本文に、対象申請者アカウントの氏名（`name`）を明示する（メールアドレス`email`を補助的に併記してよい）。例: 無効化時「『{name}』を無効化します。無効化するとこのアカウントでログインできなくなります。よろしいですか？」。
3. The ヘルプデスクポータル shall 無効化と再有効化で異なる見出し・本文・確認ボタン文言を表示する（無効化は`destructive`、再有効化は通常系）。
4. The ヘルプデスクポータル shall 対象名を埋め込むための翻訳キー（`helpdeskCompanies.toggleActive.deactivateConfirm`/`activateConfirm`を`{name}`プレースホルダー付きに変更、および確認見出し・確認/キャンセルボタン文言）を`messages/ja.json`・`messages/en.json`の両方に用意する。
5. When 利用者が確認モーダルで確定したときのみ, the ヘルプデスクポータル shall 既存の`setApplicantUserActiveAction`を実行し、成功後の挙動・失敗時のエラー表示を維持する。キャンセル時は何も実行しない。
6. The ヘルプデスクポータル shall `ToggleApplicantUserActiveButton`へ対象アカウント名を渡せるよう、必要に応じて呼び出し側から`name`（必要なら`email`）をpropsで受け取る。
7. The ヘルプデスクポータル shall 既存の`window.confirm`をモックする単体テスト（`ToggleApplicantUserActiveButton.test.tsx`）を、`ConfirmDialog`ベースの操作へ更新する。

### 要件 17: 販社コード（companyCode）入力ガイドと重複チェックの明確化（2026-07-22 追記）

**背景:** 販社作成フォーム（`CompanyForm`, `src/components/features/helpdesk-companies/CompanyForm.tsx`）の`companyCode`は必須の自由入力欄（`companyFormSchema`は`min(1)`のみ）で、命名規則の案内が一切ない。実データ（`prisma/seed.ts`）では`{ISO国コード小文字2桁}-daiso-{国名小文字・ハイフン区切り}`（例: `vn-daiso-vietnam`, `jp-daiso-japan-trading`）という規則が使われており、`companyCode`はDB上ユニーク制約（`Company_companyCode_key`）を持つ。現状は重複検知が送信時（`createCompanyAction`のユニーク制約違反）に限られ、入力者が規則や重複を事前に把握できない。

**目的:** ヘルプデスク担当者として、販社コードの命名規則と重複可否を入力時点で把握したい。そうすることで、規則から外れたコードや重複コードの入力による作成失敗・データ不整合を未然に防げる。

#### 受け入れ基準

1. The ヘルプデスクポータル shall 販社作成フォームの`companyCode`入力欄に、命名規則の実例を示すプレースホルダー（例: `vn-daiso-vietnam`）を表示する。
2. The ヘルプデスクポータル shall `companyCode`入力欄付近にヘルプテキストを表示し、命名規則（`{ISO国コード小文字2桁}-daiso-{国名小文字・ハイフン区切り}`、使用可能文字は半角英小文字・数字・ハイフンのみ）と、コードが全販社で一意である必要があることを案内する。
3. The ヘルプデスクポータル shall `companyCode`のフォーマット検証（半角英小文字・数字・ハイフンのみ、先頭・末尾のハイフン禁止、連続ハイフン禁止）を`companyFormSchema`（`src/lib/validation/company.ts`）に追加し、規則違反時は必須エラーとは別の専用エラーメッセージを`companyCode`フィールドに表示する。
4. The ヘルプデスクポータル shall 重複チェックのタイミングを次のとおり明確化する: (a) 送信時は既存どおり`createCompanyAction`のユニーク制約違反を検知して`companyCode`フィールドへ重複エラー（既存の`companyCodeDuplicateMessage`）を表示する（最終的な一意性はサーバー側で担保）。(b) 加えて、`companyCode`入力欄のblur時に軽量なServer Action（例: `checkCompanyCodeAvailabilityAction`）で既存コードとの重複を非同期照会し、重複時は送信前に`companyCode`フィールドへ警告を表示する。
5. The ヘルプデスクポータル shall 編集モード（既存Company）でも同じフォーマット検証・入力ガイド・重複チェックを適用する（ただし自分自身の現在のコードは重複とみなさない）。
6. The ヘルプデスクポータル shall 本要件で追加するプレースホルダー・ヘルプテキスト・フォーマットエラー文言・重複警告文言を`next-intl`翻訳キーで`messages/ja.json`・`messages/en.json`の両方に追加する。
7. The ヘルプデスクポータル shall 本要件による変更で、既存の会社名・国の入力・検証、および保存後の遷移（`/helpdesk/companies/{id}`）の挙動を変更しない。
