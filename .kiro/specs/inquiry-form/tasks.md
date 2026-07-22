# 実装タスク: inquiry-form

## 実装計画

- [x] 1. 基盤セットアップ（依存パッケージ・型・選択肢定数・バリデーションスキーマ・モックAPI・翻訳キー）
- [x] 1.1 フォーム関連の依存パッケージを追加する
  - `react-hook-form`・`zod`・`@hookform/resolvers` をインストールする
  - `npm run build` が既存機能に影響を与えず完了することで完了とする
  - _Requirements: 5.1_

- [x] 1.2 問い合わせ・申請フォームに関する型定義を作成する
  - `Inquiry`（id・category・urgency・storeRegion・originalText・originalLanguage・translatedText・status・createdAt・submittedBy を含む）を定義する
  - `Inquiry` から `id` と `translatedText` を除いた送信用の型（`CreateInquiryInput`）を定義する
  - `any` 型を使用せず、strict TypeScript で全フィールドの型が明示されていることで完了とする
  - _Requirements: 6.2_

- [x] 1.3 フォームの選択肢（分類・緊急度・地域・国・原文言語）を定数として定義する
  - 案件種別（`defect`/`order`/`system`/`other`）・緊急度（`high`/`medium`/`low`）のコード一覧を定義する
  - 対象国（ISO 3166-1 alpha-2）・原文言語（ISO 639-1）のコード一覧を定義する
  - 選択肢のコードと表示ラベルを分離し、コード一覧を1箇所変更するだけで選択肢を追加・変更できることで完了とする
  - _Requirements: 2.1, 2.2, 2.5, 3.2, 4.2_

- [x] 1.4 フォーム入力値の zod バリデーションスキーマを定義する
  - 分類・緊急度・地域・自由記述・原文言語・会社名・国を必須項目として検証するスキーマを定義する
  - 自由記述欄に最大文字数のバリデーションルールを設定する
  - スキーマから `InquiryFormValues` 型が推論され、フォーム側の型と自動的に一致することで完了とする
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 1.5 問い合わせ・申請送信のモックAPI関数を実装する
  - `lib/api/inquiries.ts` に、送信データを受け取り一意なIDを付与した `Inquiry` を返す送信関数を追加する
  - 送信関数が実APIと同一の引数・戻り値の型インターフェースを持ち、`Promise` を返すことで完了とする
  - `status` に `"new"`、`createdAt` に送信時刻が設定された状態で `Inquiry` が生成されることで完了とする
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 1.6 問い合わせ・申請フォームの日本語・英語翻訳キーを追加する
  - フィールドラベル・選択肢の表示名・必須マーク・バリデーションエラーメッセージ・送信完了/失敗メッセージの翻訳キーを `messages/ja.json`・`messages/en.json` に追加する
  - `ja.json` で定義した全キーが `en.json` にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 1.3, 2.4, 5.5, 7.4, 8.1, 8.3_

---

- [x] 2. UIプリミティブコンポーネントの追加（Button・Input・Textarea・Label・Select・Alert）
- [x] 2.1 (P) Buttonコンポーネントを実装する
  - 送信ボタンとして使用する汎用ボタンコンポーネントを実装する
  - `disabled` 状態でクリック不可・視覚的にも無効化されていることで完了とする
  - _Requirements: 6.3_
  - _Boundary: Button_

- [x] 2.2 (P) Inputコンポーネントを実装する
  - 単一行テキスト入力用の汎用コンポーネントを実装する
  - フォーカス・エラー状態に応じたスタイルが適用されることで完了とする
  - _Requirements: 2.3, 4.1_
  - _Boundary: Input_

- [x] 2.3 (P) Textareaコンポーネントを実装する
  - 複数行テキスト入力用の汎用コンポーネントを実装する
  - 最大文字数に近づいた場合に残り入力可能文字数を表示できるプロパティを持つことで完了とする
  - _Requirements: 3.1, 3.4_
  - _Boundary: Textarea_

- [x] 2.4 (P) Labelコンポーネントを実装する
  - フォームフィールド用のラベルコンポーネントを実装する
  - 必須項目に視覚的インジケーターを表示できることで完了とする
  - _Requirements: 1.4_
  - _Boundary: Label_

- [x] 2.5 (P) Selectコンポーネントを実装する
  - 分類・緊急度・国・原文言語の選択に使用する汎用の選択式コンポーネントを実装する
  - 選択肢一覧と選択中の値を受け取り、選択変更時にコールバックが呼ばれることで完了とする
  - _Requirements: 2.1, 2.2, 3.2, 4.2_
  - _Boundary: Select_

- [x] 2.6 (P) Alertコンポーネントを実装する
  - 送信結果（成功・失敗）を通知するバナー表示用のコンポーネントを、成功・失敗の見た目を切り替えられるバリアント付きで実装する
  - 成功・失敗それぞれのバリアントで視覚的に区別されることで完了とする
  - _Requirements: 7.1, 7.3, 7.4_
  - _Boundary: Alert_

---

- [x] 3. フォーム共有コンポーネントと入力セクションの実装
- [x] 3.1 FormField共有ラッパーを実装する
  - ラベル・必須インジケーター・エラーメッセージ表示を統一する共有コンポーネントを実装する
  - エラー時に翻訳キー経由のエラーメッセージが子要素の下に表示されることで完了とする
  - _Requirements: 1.4, 5.2, 5.5_
  - _Depends: 2.4_

- [x] 3.2 (P) 分類・緊急度・地域の入力セクション（InquiryDetailsSection）を実装する
  - 分類・緊急度をSelect、地域を自由入力Inputで入力できるセクションを実装する
  - 画面幅に応じて1カラム/2カラムのレイアウトに切り替わることで完了とする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.2_
  - _Boundary: InquiryDetailsSection_
  - _Depends: 1.2, 1.3, 1.6, 3.1_

- [x] 3.3 (P) 自由記述・原文言語の入力セクション（InquiryDescriptionSection）を実装する
  - 複数行の自由記述欄と原文言語のSelectを配置したセクションを実装する
  - 自由記述欄の文字数が上限に近づくと残り入力可能文字数が表示されることで完了とする
  - _Requirements: 3.1, 3.2, 3.4, 9.2_
  - _Boundary: InquiryDescriptionSection_
  - _Depends: 1.2, 1.3, 1.6, 3.1_

- [x] 3.4 (P) 申請者情報の入力セクション（ApplicantInfoSection）を実装する
  - 会社名Inputと国Selectのセクションを実装する
  - 会社名・国のいずれも未入力状態では送信不可であることが分かるUIであることで完了とする
  - _Requirements: 4.1, 4.2, 4.3, 9.2_
  - _Boundary: ApplicantInfoSection_
  - _Depends: 1.2, 1.3, 1.6, 3.1_

---

- [x] 4. フォーム統合と送信処理
- [x] 4.1 InquiryFormの状態管理・バリデーション統合を実装する
  - `react-hook-form` を zod スキーマと連携させて初期化し、3つの入力セクションを1つのフォームとして統合する
  - 各セクションを画面に配置し、必須項目未入力のまま送信を試みると該当フィールドにエラーが表示され送信が中断されることで完了とする
  - エラー状態のフィールドに有効な値を入力すると、そのフィールドのエラー表示が自動的に解除されることで完了とする
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.4_
  - _Depends: 1.4, 2.1, 2.6, 3.2, 3.3, 3.4_

- [x] 4.2 送信処理と送信結果フィードバックを実装する
  - バリデーション成功時に送信データを組み立て、モックAPIの送信関数を呼び出す処理を実装する。自由記述欄は原文のまま送信し、送信前に翻訳処理を行わない
  - 送信中は送信ボタンを無効化してローディング表示を行い、成功時は完了バナー表示とフォームリセット・問い合わせ一覧ページへのリンク表示を行う
  - 送信失敗時はエラーバナーを表示し、入力内容を保持したままフォームを操作可能な状態に戻すことで完了とする
  - _Requirements: 3.3, 6.1, 6.3, 6.4, 7.1, 7.2, 7.3_
  - _Depends: 1.5, 4.1_

- [x] 4.3 問い合わせ・申請フォーム画面にフォーム本体を統合する
  - `/inquiry/new` ページの表示内容を、Placeholder表示からフォーム本体の表示に置き換える
  - ブラウザで `/ja/inquiry/new` および `/en/inquiry/new` を開くと、Placeholderではなく実際の入力フォームが表示されることで完了とする
  - タブレット幅（768px以上）で横スクロールが発生しないことで完了とする
  - _Requirements: 1.1, 9.1_
  - _Depends: 4.2_

---

- [ ] 5. 検証
- [x] 5.1 バリデーションスキーマと送信データ変換ロジックのユニットテストを作成する
  - 必須項目の未入力・自由記述の文字数超過など異常系の入力に対してスキーマがエラーを返すことを検証する
  - 正常な入力に対してフォーム値から送信用データへの変換結果が期待通りであることを検証するテストが通ることで完了とする
  - _Requirements: 5.2, 5.3, 6.2, 6.4_
  - _Depends: 1.4_

- [x] 5.2 フォーム送信フローの統合テストを作成する
  - モックAPIの送信関数をモック化し、送信成功時に完了バナーが表示されフォームがリセットされることを検証する
  - 送信失敗時にエラーバナーが表示され入力内容が保持されることを検証するテストが通ることで完了とする
  - _Requirements: 6.1, 6.3, 7.1, 7.3_
  - _Depends: 4.2_

- [ ] 5.3 * レスポンシブレイアウトと多言語表示のE2E確認を行う
  - タブレット幅表示時のレイアウト崩れの有無、および日本語・英語切り替え時にフォーム全体（ラベル・選択肢・エラーメッセージ）の表示言語が切り替わることを確認する
  - 存在しない翻訳キーが英語にフォールバックされることを確認する
  - _Requirements: 8.1, 8.2, 9.1, 9.2_
  - _Depends: 4.3_

---

## 追加ラウンド（2026-07-03）: 添付ファイル対応

- [x] 6. 基盤セットアップ（添付ファイルの型・上限定数・検証ユーティリティ・翻訳キー）
- [x] 6.1 添付ファイルの型定義を追加する
  - 添付ファイル1件を表す型（id・ファイル名・MIMEタイプ・サイズ・データURLを持つ）を定義する
  - `Inquiry`・`CreateInquiryInput`・フォーム入力値の型に、添付ファイル一覧を保持する任意フィールドとして追加する
  - `any`型を使用せず、`Inquiry`・`CreateInquiryInput`の既存フィールドの型を変更しないことで完了とする
  - _Requirements: 10.9_

- [x] 6.2 添付ファイルの上限定数を定義する
  - 1件あたりの最大サイズ・1回の送信あたりの最大件数・許可するファイル形式（画像・PDF）を定数として定義する
  - 他specから読み取り専用でインポートできる独立したモジュールとして配置することで完了とする
  - _Requirements: 10.4_

- [x] 6.3 添付ファイルの検証・変換ユーティリティを実装する
  - ファイルのサイズ・形式・（既存選択数を踏まえた）件数を検証し、合否と理由を返す関数を実装する
  - ファイルの内容をBase64データURル文字列に非同期で変換する関数を実装する
  - サイズ超過・形式不許可・件数超過のそれぞれのケースで検証関数が該当する不合格理由を返すことで完了とする
  - _Requirements: 10.4, 10.5_
  - _Depends: 6.1, 6.2_

- [x] 6.4 添付ファイル関連の日本語・英語翻訳キーを追加する
  - 添付欄のラベル・プレースホルダー・削除ボタン・サイズ超過/形式不許可/件数超過のエラーメッセージの翻訳キーを追加する
  - `ja.json`で定義した全キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 10.5_

---

- [x] 7. (P) AttachmentFieldコンポーネントを実装する
  - 複数ファイルを選択できるUIを提供し、選択されたファイルを検証したうえで、画像はサムネイル、それ以外はファイル名・サイズで一覧プレビュー表示する
  - 一覧の各ファイルを個別に削除できる操作を提供する
  - 上限を超える・許可されない形式のファイルが選択されたときは一覧に追加せずエラーメッセージを表示する
  - ブラウザで画像ファイルを選択するとサムネイルが表示され、削除ボタンで一覧から取り除けることで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - _Boundary: AttachmentField_
  - _Depends: 6.3, 6.4_

---

- [x] 8. AttachmentFieldをInquiryFormへ統合する
- [x] 8.1 InquiryFormに添付ファイル欄を組み込み、送信データに含める
  - フォーム内に添付ファイル欄を配置し、選択された添付ファイルをフォームの状態として保持する
  - 添付ファイルを必須項目とせず、0件のままでも送信できるようにする
  - 送信時に、選択された添付ファイル（データURLを含む）がモック送信関数へ渡されるデータに含まれることで完了とする
  - _Requirements: 10.6, 10.7, 10.8_
  - _Boundary: InquiryForm_
  - _Depends: 7_

---

- [x] 9. 検証（添付ファイル）
- [x] 9.1 検証・変換ユーティリティのユニットテストを作成する
  - サイズ超過・許可されない形式・件数超過のそれぞれで検証関数が不合格を返すことを確認する
  - 正常なファイルに対してデータURLへの変換が成功することを確認するテストが通ることで完了とする
  - _Requirements: 10.4, 10.5_
  - _Depends: 6.3_

- [x] 9.2 AttachmentFieldの統合テストを作成する
  - ファイル選択によるプレビュー表示、削除操作、上限超過時のエラー表示と一覧に追加されないことを検証する
  - 画像ファイルはサムネイルが、非画像ファイルはファイル名・サイズが表示されることを検証するテストが通ることで完了とする
  - _Requirements: 10.1, 10.2, 10.3, 10.5_
  - _Depends: 7_

- [x] 9.3 InquiryForm全体での添付ファイル送信の統合テストを作成する
  - 添付ファイルを選択して送信した場合に、モック送信関数へ渡されるデータに添付ファイルが含まれることを検証する
  - 添付ファイルを選択しない場合でも送信がブロックされないことを検証するテストが通ることで完了とする
  - _Requirements: 10.6, 10.7_
  - _Depends: 8.1_

- [ ] 9.4 * 添付ファイルのE2E確認を行う
  - 画像ファイル選択時のサムネイル表示、PDF等非画像ファイル選択時のファイル名表示、複数ファイルの同時選択、上限超過時のエラーメッセージ表示を日本語・英語の両方で確認する
  - _Requirements: 10.1, 10.2, 10.5_
  - _Depends: 8.1_

---

## 追加ラウンド（2026-07-10）: 問い合わせタイトルの追加

> 本ラウンドは`inquiry-list`spec側の一覧・詳細でのタイトル表示・本文プレビュー・余白改善タスクと対になっている。`inquiry-list`側のタスクは本ラウンドのタスク10完了後に着手すること。

- [x] 10. 基盤: title列のスキーマ・型・バリデーション・翻訳キーを追加する
  - `prisma/schema.prisma`の`model Inquiry`に`title String @default("")`を追加し、`prisma migrate dev --name add_inquiry_title`でマイグレーションを生成・適用する
  - `src/types/inquiry.ts`の`Inquiry`に`title: string`を追加する（`CreateInquiryInput`は`Omit`経由で自動反映されることを確認する）
  - `src/lib/validation/inquiry.ts`に`TITLE_MAX_LENGTH`（100）定数と`title: z.string().trim().min(1).max(TITLE_MAX_LENGTH)`を追加する
  - `messages/ja.json`・`messages/en.json`の`inquiryForm.fields`に`title.label`・`title.placeholder`を追加する
  - マイグレーションが適用され、`inquiryFormSchema`のユニットテストでタイトル必須・最大文字数検証が通ることで完了とする
  - _Requirements: 11.1, 11.3, 11.4, 11.5_

---

- [x] 11. (P) InquiryDescriptionSectionにタイトル入力欄を追加する
  - `originalText`欄の直前に1行のタイトル入力欄（`Input`、`md:col-span-2`）を追加する
  - 既存フィールドと同じ`FormField`パターン（`required`・`requiredIndicator`・`error={errors.title ? t("validation.required") : undefined}`）に従う
  - ブラウザで`/inquiry/new`を開くとタイトル入力欄が表示され、未入力のまま送信するとエラーが表示されることで完了とする
  - _Requirements: 11.1, 11.2, 11.5_
  - _Boundary: InquiryDescriptionSection_
  - _Depends: 10_

- [x] 12. (P) サーバー側マッピング（inquiry-service・inquiry-mapper）にtitleを配線する
  - `src/lib/server/inquiry-service.ts`の`createInquiryRecord`内`prisma.inquiry.create({ data: {...} })`に`title: input.data.title`を追加する
  - `src/lib/server/inquiry-mapper.ts`の`mapInquiry`に`title: record.title`を追加する
  - `createInquiry`で作成した問い合わせを`getInquiryById`で取得すると、送信した`title`がそのまま読み出せることで完了とする
  - _Requirements: 11.4_
  - _Boundary: InquiryService, InquiryMapper_
  - _Depends: 10_

- [x] 13. prisma/seed.tsの既存シードデータにtitleを追加する
  - `seed-inquiry-001`と`ADDITIONAL_INQUIRY_SEEDS`（10件）それぞれに、内容を要約した`title`を追加し、`seedAdditionalInquiries`のupsert呼び出しに配線する
  - シード再投入後、既存の全問い合わせに空でない`title`が設定されていることで完了とする
  - _Requirements: 11.4_
  - _Depends: 12_

---

- [x] 14. 検証（問い合わせタイトル）
- [x] 14.1 バリデーション・サービス層のユニットテストを更新する
  - `validation/inquiry.test.ts`にタイトル未入力・最大文字数超過のテストケースを追加する
  - `inquiry-service.test.ts`・`inquiry-form-mapper.test.ts`・`actions/inquiry.test.ts`・`api/inquiries.test.ts`の既存の`Inquiry`/`CreateInquiryInput`リテラルに`title`を追加し、型チェック・既存テストが通ることで完了とする
  - _Requirements: 11.2, 11.3, 11.4_
  - _Depends: 10, 12_

- [x] 14.2 InquiryFormの統合テストを更新する
  - `InquiryForm.test.tsx`のリテラルに`title`を追加し、タイトル未入力時に送信がブロックされること、送信データに`title`が含まれることを検証するテストが通ることで完了とする
  - _Requirements: 11.1, 11.2_
  - _Depends: 11_

- [ ] 14.3 * タイトル入力・表示のE2E確認を行う
  - `/inquiry/new`でタイトルを入力して送信し、一覧・詳細画面（`inquiry-list`spec側）でそのタイトルが表示されることを日本語・英語の両方で確認する
  - _Requirements: 11.1, 11.4_
  - _Depends: 14.2_

---

## 追加ラウンド（2026-07-13）: ヘルプデスク代理登録対応

- [x] 15. 基盤: `createInquiry`のセッション分岐
- [x] 15.1 `createInquiry`にヘルプデスク経路を追加する
  - `src/lib/api/inquiries.ts`の`createInquiry`を、`getSession()`で取得したロールに応じて分岐させる（`applicant`→既存動作、`helpdesk`+`proxyCompanyId`引数→`requireHelpdeskStaffSession()`を要求し指定`companyId`で作成、いずれでもない場合→`UnauthorizedSessionError`）
  - 既存の`createInquiry(input)`（引数1つ）の呼び出しが変更なしに動作すること、ヘルプデスクセッション+`proxyCompanyId`で会社IDが正しく設定されること、いずれの条件も満たさない場合に例外が送出されることを検証する単体テストが通ることで完了とする
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - _Boundary: InquiryService (createInquiry)_

---

- [x] 16. コア: 対象会社選択欄の追加
- [x] 16.1 (P) 会社選択欄の翻訳キーを追加する
  - `messages/ja.json`・`messages/en.json`に`inquiryForm.fields.targetCompany`（ラベル・プレースホルダー・未選択時のバリデーションエラー）を追加する
  - `ja.json`で定義した新規キーが`en.json`にも存在し、キー構造が一致していることで完了とする
  - _Requirements: 12.9_
  - _Boundary: i18n messages_

- [x] 16.2 `InquiryForm`/`ApplicantInfoSection`に`mode`/`companies`propと対象会社選択欄を追加する
  - `InquiryForm`に`mode?: "self" | "helpdeskProxy"`（既定`"self"`）・`companies?: { id: string; name: string; country: string }[]`propを追加し、`ApplicantInfoSection`へ伝播する
  - `ApplicantInfoSection`は`mode === "helpdeskProxy"`のときのみ、既存の会社名・国欄の下に対象会社`Select`（`companies`をoptionsとする）を表示する
  - `mode`未指定（既定値`"self"`）のときに既存の`/inquiry/new`の表示が変化しないことを検証する回帰テストが通ることで完了とする
  - _Requirements: 12.5, 12.6_
  - _Boundary: InquiryForm, ApplicantInfoSection_
  - _Depends: 16.1_

- [x] 16.3 `inquiryFormSchema`に`mode`依存のバリデーションを追加する
  - `mode === "helpdeskProxy"`のときのみ対象会社（`targetCompanyId`）を必須とする条件付きバリデーションを追加する（`mode === "self"`では既存のバリデーションを変更しない）
  - 未選択のまま送信をブロックすること、`mode="self"`では既存の検証結果が変わらないことを検証する単体テストが通ることで完了とする
  - _Requirements: 12.7_
  - _Boundary: InquiryFormSchema_
  - _Depends: 16.2_

- [x] 16.4 送信ハンドラを対象会社IDの振り分けに対応させる
  - `InquiryForm`の送信ハンドラで、`mode === "helpdeskProxy"`のとき選択された会社の`id`を`createInquiryAction`/`createInquiry`の第2引数（`proxyCompanyId`）として渡し、`mode === "self"`のときは第2引数を渡さない
  - `toCreateInquiryInput`（`inquiry-form-mapper.ts`）は`targetCompanyId`を`CreateInquiryInput`本体に含めないことを確認する
  - 統合テストで、`mode="helpdeskProxy"`で選択した会社IDが`createInquiry`に渡ることを検証し、通ることで完了とする
  - _Requirements: 12.8_
  - _Boundary: InquiryForm_
  - _Depends: 16.3_

---

- [x] 17. 検証（ヘルプデスク代理登録対応）
- [x] 17.1 `tsc --noEmit`・`npm run lint`・`npm test`が全て通ることを確認する
  - _Requirements: 12.1〜12.9_
  - _Depends: 15.1, 16.4_

- [ ]* 17.2 代理登録フローのE2E確認を行う（`helpdesk-inquiry-management`spec側の画面結線と合わせて実施）
  - ヘルプデスク側の代理登録画面（`helpdesk-inquiry-management`spec 要件15所有）から会社を選択して送信すると、指定した会社の問い合わせとして`getAllInquiries`に反映されることを確認する
  - _Requirements: 12.3, 12.4, 12.8_
  - _Depends: 17.1_

---

## 追加タスク（2026-07-22）: 投稿時の`translatedText`を書き込まないことの保証（要件13）

- [ ] 18. `createInquiryRecord`が`translatedText`を書き込まないことの回帰テストを追加する
  - 対象: `src/lib/server/inquiry-service.test.ts`
  - `createInquiryRecord`を呼び出したとき、`prisma.inquiry.create`に渡る`data`に`translatedText`が含まれない（＝DB既定の`null`のまま作成される）ことを検証するケースを追加する。既存テストのモック方針（`prisma`のモック）に合わせて、`create`呼び出し引数の`data`をアサートする形でよい
  - 併せて、返却された`Inquiry`（`mapInquiry`経由）の`translatedText`が`undefined`であることを検証してもよい
  - _Requirements: 13.1, 13.3, 13.4_
  - _Boundary: createInquiryRecord (inquiry-service)_

- [ ]* 19. （任意）`createInquiryRecord`付近に意図を示すコメントを追加する
  - `src/lib/server/inquiry-service.ts`の`createInquiryRecord`付近に、`translatedText`を投稿時に書き込まない理由（フェーズ3の実翻訳API導入まで`null`維持、表示側の未翻訳注記は`helpdesk-inquiry-management`spec Requirement 17が担当）を短く記載し、将来の誤改修を防ぐ
  - _Requirements: 13.3_
  - _Boundary: createInquiryRecord (inquiry-service)_

- [ ] 20. 検証（投稿時translatedText非書き込みの保証）
  - `tsc --noEmit`・`npm run lint`・`npm test`が全て通ることを確認する
  - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - _Depends: 18_
