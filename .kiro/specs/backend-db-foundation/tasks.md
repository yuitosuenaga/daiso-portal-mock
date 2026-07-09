# 実装計画

- [x] 1. 開発環境のDB基盤構築（Docker Compose + PostgreSQL）
  - PostgreSQLサービスをDocker Composeで定義し、DB名・ユーザー・パスワードを環境変数化する
  - 名前付きボリュームでデータを永続化し、コンテナ再起動後もデータが残るようにする
  - 接続情報のテンプレートを`.env.example`として用意し、`.gitignore`に`.env`を追加して秘匿値をコミット対象外にする
  - Observable: `docker compose up -d`実行後、DBeaverから公開ポートへ接続してテーブル構造を確認できる。コンテナ再起動後もデータが失われない
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Prismaによるスキーマ管理とシードデータ
- [x] 2.1 Prisma初期化とスキーマ定義
  - Company・ApplicantUser・HelpdeskStaff・Inquiry・InquiryAttachment・InquiryHistoryEntryのモデルと、category・urgency・status・対応履歴種別のEnumを定義する
  - 外部キー（Inquiry.companyId、claimedByStaffId、Attachmentの相互排他的な親参照）とインデックス（companyId、inquiryId）を定義する
  - Prisma Clientシングルトンを追加し、`DATABASE_URL`の値のみで開発環境（Docker PostgreSQL）と将来の本番環境（Cloud SQL、Unixソケット接続）を切り替えられる構成にする
  - Observable: `prisma validate`が成功し、生成されたスキーマがdesign.mdの物理データモデルと一致する
  - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.2, 8.3_

- [x] 2.2 マイグレーション適用とシードスクリプト
  - `prisma migrate dev`でローカルのDocker PostgreSQLにスキーマを適用する
  - 会社・申請者ユーザー・ヘルプデスク担当者・問い合わせサンプルを投入するシードスクリプトを作成し、パスワードはbcryptjsでハッシュ化して保存する
  - Observable: シード実行後、DBeaverで各テーブルに初期データ（ログイン確認用の会社・ユーザーを含む）が表示される
  - _Requirements: 2.2, 2.4_
  - _Depends: 2.1_

- [x] 3. 認証基盤（Auth.js設定・セッションガード）
- [x] 3.1 Auth.js設定と2種のCredentials Provider
  - `applicant-credentials`・`helpdesk-credentials`という2つのProviderを設定し、それぞれメールアドレス・パスワードで対応するテーブル（ApplicantUser／HelpdeskStaff）を照会してbcryptjsでパスワードを照合する
  - 認証成功時にJWTセッションへrole（applicant／helpdesk）とcompanyId・staffId等のクレームを格納する
  - Observable: 正しい認証情報でサインインするとroleとID情報を含むセッションが確立し、誤った認証情報ではサインインが失敗する
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1_
  - _Depends: 2.2_

- [x] 3.2 ロール別セッション検証ヘルパー
  - 申請者側・ヘルプデスク側それぞれの必須セッション取得関数を実装し、未ログインまたはロール不一致の場合に例外を送出する
  - Observable: セッションが存在しない状態で呼び出すと例外が送出され、正しいロールのセッションが存在する場合はセッション情報（companyId／staffId等）が取得できる
  - _Requirements: 6.2, 6.3, 6.4_
  - _Depends: 3.1_

- [x] 4. 問い合わせドメインサービス層
- [x] 4.1 問い合わせの作成・一覧・詳細取得ロジック
  - 問い合わせ作成時にセッションから解決した会社IDを永続化し、フォーム入力値（会社名・国）は表示用フィールドとして別途保持する
  - 自社スコープの一覧取得（会社ID一致）、全社一覧取得、ID指定の詳細取得を実装し、Prismaのモデルと既存のInquiry型を相互変換する
  - Observable: 作成した問い合わせが自社の一覧には含まれ、他社スコープの一覧には含まれないことを確認できる
  - _Requirements: 3.4, 3.7, 7.3, 7.4, 7.5_
  - _Depends: 2.2, 3.2_

- [x] 4.2 対応中フラグ・ステータス変更・対応履歴の操作ロジック
  - 対応中フラグの設定・解除（既にclaim済みの場合はエラーとする二重claim防止）とステータス変更を実装する
  - 対応履歴の追加・取得を実装し、添付ファイルがInquiry本体（申請時）またはHistoryEntry（返信・申請者メッセージ時）のいずれか一方のみに紐づく制約を保証する
  - Observable: 既にclaim済みの問い合わせへの再claimがエラーとなり、ステータス変更・対応履歴追加が正しく永続化される
  - _Requirements: 3.5, 3.6, 7.6, 7.7, 7.8_
  - _Depends: 4.1_

- [x] 5. 問い合わせRoute Handlers
- [x] 5.1 (P) 作成・一覧・詳細のRoute Handler
  - 問い合わせの作成（POST）、一覧取得（GET、申請者は自社分・ヘルプデスクは全件）、詳細取得（GET）のエンドポイントをセッション検証付きで実装する
  - Observable: 認証済みリクエストで作成・一覧・詳細取得がHTTPレスポンスとして正しく返り、未認証リクエストは401となる
  - _Requirements: 7.1_
  - _Boundary: 問い合わせRoute Handlers_
  - _Depends: 4.1, 3.2_

- [x] 5.2 (P) claim・ステータス・対応履歴のRoute Handler
  - 対応中フラグ設定・解除、ステータス変更、対応履歴追加のエンドポイントを実装し、二重claim時は409、対象なしは404、不正な入力は400を返す
  - Observable: 二重claimを試みると409が返り、存在しないIDへのアクセスは404が返る
  - _Requirements: 7.1_
  - _Boundary: 問い合わせRoute Handlers_
  - _Depends: 4.2, 3.2_

- [x] 6. ログイン画面とルート保護
- [x] 6.1 (P) 申請者側・ヘルプデスク側ログイン画面
  - それぞれのログイン画面を新規作成し、対応するCredentials Providerでサインインを行う。認証失敗時はエラーメッセージを表示し画面に留まる
  - Observable: 正しい認証情報でログインするとそれぞれのダッシュボードへ遷移し、誤った認証情報ではエラーメッセージが表示されたままログイン画面に留まる
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3, 5.5_
  - _Boundary: ログイン画面_
  - _Depends: 3.1_

- [x] 6.2 (P) Middlewareでのロケール処理と認証チェックの合成
  - 既存のnext-intlロケール処理の後段でセッションを検証し、未ログインまたはロール不一致のアクセスを該当ロールのログイン画面へリダイレクトする
  - ログイン画面自体と認証用エンドポイントはリダイレクト対象から除外し、リダイレクトループを防ぐ
  - Observable: 未ログインで保護パスにアクセスするとログイン画面へリダイレクトされる。申請者セッションでヘルプデスク側保護パスへアクセスするとヘルプデスクログイン画面へリダイレクトされる
  - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - _Boundary: Middleware_
  - _Depends: 3.1, 3.2_

- [x] 7. 既存コードの実DB・認証連携への切替
- [x] 7.1 lib/api互換層の内部実装差し替え
  - 既存のエクスポート関数（作成・一覧・詳細取得・claim設定・ステータス更新・履歴追加取得）のシグネチャを変更せず、内部実装をセッション検証＋サービス層呼び出しに置き換える
  - Observable: 既存の呼び出し元（Server Component・Server Action）のコードを変更せずに、実DBの値が返るようになる
  - _Requirements: 4.4, 7.2, 9.1, 9.2_
  - _Depends: 5.1, 5.2_

- [x] 7.2 (P) 問い合わせフォームと申請者メッセージ送信の認証連携
  - 問い合わせフォームの送信先を、新設のServer Action経由の呼び出しに変更する（import・呼び出し箇所のみの変更で、入力項目・見た目は変更しない）
  - 申請者からの追加メッセージ送信に、ログイン中セッションの会社IDと対象問い合わせの会社IDが一致することを検証するガードを追加する
  - Observable: ログイン中の申請者が送信した問い合わせの会社IDがセッションの会社と一致して保存され、他社の問い合わせへのメッセージ送信は拒否される
  - _Requirements: 7.3, 9.1_
  - _Boundary: 問い合わせフォーム, 申請者メッセージ送信アクション_
  - _Depends: 7.1_

- [x] 7.3 (P) ヘルプデスクServer Actionのセッション連携
  - claim設定・解除・ステータス変更・返信送信の各操作で使われている固定の担当者名参照を、ログイン中セッションの担当者情報に置き換える
  - Observable: claim・ステータス変更・返信の対応履歴に、ログイン中のヘルプデスク担当者の氏名が記録される
  - _Requirements: 5.4, 7.6, 7.7_
  - _Boundary: ヘルプデスクServer Action_
  - _Depends: 7.1_

- [x] 8. (P) ヘルプデスク側ルーティング再編
  - 既存のヘルプデスク配下の各ページをシェル付きのルートグループへ移動し、トップレベルのレイアウトをシェルなしのパススルーに変更したうえで、シェルなしのログイン画面を追加する
  - Observable: ヘルプデスクのログイン画面はサイドバーなしで表示され、既存のヘルプデスク側ページは移動後も同じ見た目・操作性で動作する
  - _Requirements: 6.3_
  - _Boundary: ヘルプデスク側ルーティング_
  - _Depends: 6.1_

- [x] 9. テストの適応と新規カバレッジ
- [x] 9.1 既存vitestテストのモック更新
  - 既存の問い合わせ関連テストで、セッション取得とDBアクセスをモック化し、実装差し替え後も既存のアサーション（自社分のみ取得等）が成功する状態を維持する
  - Observable: `npm run test`が既存テストを含めて成功する
  - _Requirements: 9.2_
  - _Depends: 7.1, 7.2, 7.3_

- [x] 9.2 (P) 認証・サービス層の新規単体テスト
  - パスワード照合の成功・失敗、自社スコープ絞り込み、二重claim防止、PrismaモデルとTS型の相互変換ロジックを検証するテストを追加する
  - Observable: 新規テストで、他社の問い合わせが一覧に含まれないこと・二重claimが拒否されることを確認できる
  - _Requirements: 3.4, 3.5, 3.7, 4.3, 5.3, 7.4, 7.5, 7.6_
  - _Depends: 3.1, 4.1, 4.2_

- [ ] 9.3 (P)* Middlewareルート保護の統合テスト
  - 未ログインリダイレクト、ロール不一致時のリダイレクトを検証するテストを追加する
  - Observable: テストで、未ログインアクセス時にリダイレクト先が該当ロールのログイン画面になることを確認できる
  - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - _Depends: 6.2_

- [x] 9.4 README更新
  - Docker起動、マイグレーション、シード投入、申請者側・ヘルプデスク側それぞれのログイン手順をREADMEに追記する
  - Observable: README記載の手順のみで、初めてクローンした環境からログインまで到達できる
  - _Requirements: 9.3_
  - _Depends: 8_

- [x] 10. お知らせ領域のPrismaスキーマ・シード拡張
- [x] 10.1 Announcement関連モデルの追加とマイグレーション
  - `Announcement`・`AnnouncementRecipient`・`AnnouncementRecipientStatus`モデルと`AnnouncementCategory`・`AnnouncementTargetingScope`Enumを`schema.prisma`に追加する
  - `Company`に`announcementRecipients`の逆参照リレーションを追加し、`AnnouncementRecipientStatus`に`(announcementId, recipientId)`の一意制約を設定する
  - `prisma migrate dev`でマイグレーションを生成・適用する
  - Observable: `prisma validate`が成功し、DBeaverで新規テーブルが確認できる
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10.2 シードデータの拡張（会社8社・お知らせ5件・担当者16名・確認状況）
  - `DOCUMENT_COMPANY_OPTIONS`相当の会社8社をupsertし、既存モックと同内容のお知らせ5件・担当者16名（2名×8社）・確認済み/実施済み/リマインド送信状況を`seed.ts`に追加する
  - Observable: シード実行後、DBeaverで各テーブルに既存モックと同等のデモデータが表示される
  - _Requirements: 10.3, 10.4_
  - _Depends: 10.1_

- [x] 11. セッションクレーム拡張
- [x] 11.1 ApplicantSessionClaimsへのcompanyCode・country追加
  - `src/types/session.ts`の`ApplicantSessionClaims`に`companyCode`・`country`を追加し、`src/lib/server/authorize.ts`の`authorizeApplicantCredentials`の戻り値に含める
  - Observable: 申請者ログイン後のセッションクレームに`companyCode`・`country`が含まれる
  - _Requirements: 11.2, 11.6_
  - _Depends: 10.1_

- [x] 12. お知らせドメインサービス層
- [x] 12.1 お知らせ取得・作成・更新・削除ロジック
  - `announcement-mapper.ts`でPrismaモデルと既存`Announcement`型（`targeting`ユニオン型を含む）を相互変換する
  - `announcement-service.ts`に自社country絞り込みの一覧・詳細取得、全件一覧・詳細取得、作成・更新・削除を実装する
  - Observable: 配信対象が特定の国のお知らせが、対象国のセッションでのみ取得できる
  - _Requirements: 10.1, 10.2, 11.2, 11.3, 11.4_
  - _Depends: 10.1, 11.1_

- [x] 12.2 確認済み・実施済み・リマインド送信状況の追跡ロジック
  - 配信対象に応じた集計対象`AnnouncementRecipient`の抽出、確認済み・実施済み人数の集計、リマインド送信記録（既存レコードの上書き・新規作成）を実装する
  - Observable: 配信対象が特定の国のお知らせでは、対象国の担当者のみが集計・追跡対象になる
  - _Requirements: 10.4, 11.7_
  - _Depends: 12.1_

- [x] 13. 既存コードの実DB・認証連携への切替
- [x] 13.1 lib/api/announcements.ts・announcement-tracking.tsの内部実装差し替え
  - 既存のエクスポート関数のシグネチャを変更せず、内部実装をセッション検証＋`announcement-service`呼び出しに置き換える
  - Observable: 既存の呼び出し元（Server Component・Server Action）のコードを変更せずに、実DBの値が返るようになる
  - _Requirements: 11.1, 11.5, 12.1_
  - _Depends: 12.1, 12.2_

- [x] 13.2 (P) MOCK_CURRENT_COMPANY参照箇所のセッション連携への切替
  - `AnnouncementList.tsx`・`AnnouncementDetail.tsx`・`ReminderAnnouncementsPanel.tsx`の`MOCK_CURRENT_COMPANY.companyCode`参照を、`requireApplicantSession()`で解決した`companyCode`に置き換える
  - Observable: 申請者側のリマインド受信表示が、ログイン中セッションの会社に基づいて正しく表示される
  - _Requirements: 11.2, 11.6_
  - _Boundary: announcements閲覧コンポーネント_
  - _Depends: 13.1_

- [x] 14. テストの適応と新規カバレッジ
- [x] 14.1 既存vitestテストのモック更新
  - `announcements.test.ts`・`announcement-tracking.test.ts`・関連コンポーネントテストで、セッション取得と`announcement-service`をモック化し、既存のアサーションが成功する状態を維持する
  - Observable: `npm run test`が既存テストを含めて成功する
  - _Requirements: 12.2_
  - _Depends: 13.1, 13.2_

- [x] 14.2 (P) お知らせサービス層の新規単体テスト
  - targeting相互変換、自社country絞り込み、配信対象に応じた集計対象抽出、リマインド送信の重複記録を検証するテストを追加する
  - Observable: 新規テストで、対象国外のお知らせが一覧に含まれないこと・配信対象外の担当者が集計対象に含まれないことを確認できる
  - _Requirements: 10.2, 11.2, 11.3, 11.7_
  - _Depends: 12.1, 12.2_

- [x] 15. ドキュメント領域のPrismaスキーマ・シード拡張
- [x] 15.1 Documentモデルの追加とマイグレーション
  - `Document`モデルと`DocumentTargetingScope`Enumを`schema.prisma`に追加する（`targetingScope`・`targetingCountries`・`targetingCompanyCodes`）
  - `prisma migrate dev`でマイグレーションを生成・適用する
  - Observable: `prisma validate`が成功し、DBeaverで新規テーブルが確認できる
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 15.2 シードデータの拡張（ドキュメント5件）
  - 既存モック（`MOCK_DOCUMENTS`）と同内容のドキュメント5件（サンプルPDFのBase64データ含む）を`seed.ts`に追加する
  - Observable: シード実行後、DBeaverで`Document`テーブルに既存モックと同等のデモデータが表示される
  - _Requirements: 13.1_
  - _Depends: 15.1_

- [x] 16. ドキュメントドメインサービス層
- [x] 16.1 ドキュメント取得・作成・更新・削除ロジック
  - `document-mapper.ts`でPrismaモデルと既存`Document`型（`targeting`ユニオン型を含む）を相互変換する
  - `document-service.ts`に自社country/companyCode絞り込みの一覧・詳細取得、全件一覧・詳細取得、作成・更新・削除を実装する
  - Observable: 公開範囲が特定の国・特定の販社のドキュメントが、対象country/companyCodeのセッションでのみ取得できる
  - _Requirements: 13.1, 13.2, 14.2, 14.3_
  - _Depends: 15.1_

- [x] 17. 既存コードの実DB・認証連携への切替
- [x] 17.1 lib/api/documents.tsの内部実装差し替え
  - 既存のエクスポート関数のシグネチャを変更せず、内部実装をセッション検証＋`document-service`呼び出しに置き換える
  - Observable: 既存の呼び出し元（Server Component・Server Action）のコードを変更せずに、実DBの値が返るようになる
  - _Requirements: 14.1, 14.4, 14.5_
  - _Depends: 16.1_

- [x] 18. テストの適応と新規カバレッジ
- [x] 18.1 既存vitestテストのモック更新
  - `documents.test.ts`・`lib/actions/documents.test.ts`で、セッション取得と`document-service`をモック化し、既存のアサーションが成功する状態を維持する
  - Observable: `npm run test`が既存テストを含めて成功する
  - _Requirements: 15.2_
  - _Depends: 17.1_

- [x] 18.2 (P) ドキュメントサービス層の新規単体テスト
  - targeting相互変換、country/companyCode絞り込みのOR条件を検証するテストを追加する
  - Observable: 新規テストで、対象外のドキュメントが一覧に含まれないことを確認できる
  - _Requirements: 13.2, 14.2_
  - _Depends: 16.1_

- [x] 19. FAQ領域のPrismaスキーマ・シード拡張
- [x] 19.1 Faqモデルの追加とマイグレーション
  - `Faq`モデルと`FaqCategory`Enumを`schema.prisma`に追加する
  - `prisma migrate dev`でマイグレーションを生成・適用する
  - Observable: `prisma validate`が成功し、DBeaverで新規テーブルが確認できる
  - _Requirements: 16.1, 16.2_

- [x] 19.2 シードデータの拡張（FAQ12件）
  - 既存モック（`MOCK_FAQS`）と同内容のFAQ12件を`seed.ts`に追加する
  - Observable: シード実行後、DBeaverで`Faq`テーブルに既存モックと同等のデモデータが表示される
  - _Requirements: 16.1_
  - _Depends: 19.1_

- [x] 20. FAQドメインサービス層とlib/api差し替え
- [x] 20.1 FAQ取得ロジックとlib/api/faqs.tsの内部実装差し替え
  - `faq-service.ts`に全件取得ロジックを実装する（セッション検証は行わない）
  - `lib/api/faqs.ts`の`getFaqs`のシグネチャを変更せず、内部実装を`faq-service`呼び出しに置き換える
  - Observable: 既存の呼び出し元（申請者側・ヘルプデスク側の両`FaqList`）のコードを変更せずに、実DBの値が返るようになる
  - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_
  - _Depends: 19.1_

- [x] 21. テストの適応と新規カバレッジ
- [x] 21.1 既存vitestテストのモック更新
  - `faqs.test.ts`で`faq-service`をモック化し、既存のアサーション（カテゴリ網羅性・ID重複なし等）が成功する状態を維持する
  - Observable: `npm run test`が既存テストを含めて成功する
  - _Requirements: 18.2_
  - _Depends: 20.1_

- [x] 21.2 (P) FAQサービス層の新規単体テスト
  - `listFaqs`がPrisma経由で全件を取得することを検証するテストを追加する
  - Observable: 新規テストで、Prisma Clientのモックから返した件数・内容が`listFaqs`の戻り値と一致することを確認できる
  - _Requirements: 16.1_
  - _Depends: 20.1_

- [x] 22. リンク集領域のPrismaスキーマ・シード拡張
- [x] 22.1 Linkモデルの追加とマイグレーション
  - `Link`モデルと`LinkCategory`Enumを`schema.prisma`に追加する
  - `prisma migrate dev`でマイグレーションを生成・適用する
  - Observable: `prisma validate`が成功し、DBeaverで新規テーブルが確認できる
  - _Requirements: 19.1, 19.2_

- [x] 22.2 シードデータの拡張（リンク11件）
  - 既存モック（`MOCK_LINKS`）と同内容のリンク11件を`seed.ts`に追加する
  - Observable: シード実行後、DBeaverで`Link`テーブルに既存モックと同等のデモデータが表示される
  - _Requirements: 19.1_
  - _Depends: 22.1_

- [x] 23. リンク集ドメインサービス層とlib/api差し替え
- [x] 23.1 リンク取得ロジックとlib/api/links.tsの内部実装差し替え
  - `link-service.ts`に全件取得ロジックを実装する（セッション検証は行わない）
  - `lib/api/links.ts`の`getLinks`のシグネチャを変更せず、内部実装を`link-service`呼び出しに置き換える
  - Observable: 既存の呼び出し元（申請者側・ヘルプデスク側の両`LinkList`）のコードを変更せずに、実DBの値が返るようになる
  - _Requirements: 19.1, 19.2, 20.1, 20.2, 20.3_
  - _Depends: 22.1_

- [x] 24. テストの適応と新規カバレッジ
- [x] 24.1 既存vitestテストのモック更新
  - `links.test.ts`で`link-service`をモック化し、既存のアサーション（カテゴリ網羅性等）が成功する状態を維持する
  - Observable: `npm run test`が既存テストを含めて成功する
  - _Requirements: 21.2_
  - _Depends: 23.1_

- [x] 24.2 (P) リンク集サービス層の新規単体テスト
  - `listLinks`がPrisma経由で全件を取得することを検証するテストを追加する
  - Observable: 新規テストで、Prisma Clientのモックから返した件数・内容が`listLinks`の戻り値と一致することを確認できる
  - _Requirements: 19.1_
  - _Depends: 23.1_
