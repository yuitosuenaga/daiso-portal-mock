# Research & Design Decisions

## Summary
- **Feature**: `helpdesk-inquiry-management`
- **Discovery Scope**: Extension（`helpdesk-portal-layout`が確立したルーティング・レイアウト・全社データ取得APIの上に構築）
- **Key Findings**:
  - 既存の`createInquiry`はモックデータ配列（`MOCK_INQUIRIES`）に書き込まず、呼び出しごとに独立したオブジェクトを返すだけの「見せかけの送信」実装になっている。これは申請フォームの送信完了体験のみを目的とした設計であり、一覧への反映は期待されていない。
  - 本specで実装する「対応中フラグ」「ステータス変更」「テンプレート返信」「テンプレート管理」は、いずれも一覧・詳細画面をまたいで変更が見える（他の画面に戻っても状態が残る）ことが機能の前提そのものであるため、`createInquiry`と同じ「非永続」パターンを踏襲すると機能が成立しない。
  - プロジェクトには`"use server"`（Server Actions）の利用実績がまだない。Next.js 14.2（`package.json`で確認）はServer Actionsが安定サポートされているバージョンであり、モックの単一プロセス内メモリ状態をミューテーションする手段として標準的な選択肢になる。

## Research Log

### 状態変更の永続化方式
- **Context**: 対応中フラグ・ステータス変更・テンプレート返信・テンプレート管理は、いずれも「変更後に別画面へ移動して戻っても変更が残る」ことが要件の前提。フェーズ1はDB未実装のため、どう永続化を模擬するか検討した。
- **Sources Consulted**: `src/lib/api/inquiries.ts`（既存の`createInquiry`実装）、`src/components/features/inquiry-form/InquiryForm.tsx`、Next.js 14 Server Actions公式ドキュメントのモデル（Server Component/Client Componentからの呼び出し・`revalidatePath`によるキャッシュ再検証）。
- **Findings**: 既存の`createInquiry`はクライアントコンポーネントから直接importして呼び出す「非永続」パターン。一方、Server Actions（`"use server"`関数）はサーバー側のモジュールスコープ状態を直接ミューテーションでき、`revalidatePath`で該当ルートの再描画をトリガーできるため、単一の開発サーバープロセス内であれば一覧⇔詳細間の状態同期を素直に実現できる。
- **Implications**: 本specで追加する変更系操作（対応中フラグのON/OFF・ステータス変更・返信送信・テンプレート追加編集）はServer Actionsとして実装し、既存の`createInquiry`とは異なる新しいパターンをこのspec内に限定して導入する。既存の読み取り専用モックAPI（`getInquiries`・`getAllInquiries`等）の呼び出し方は変更しない。

### 対応中フラグ・対応履歴の型設計
- **Context**: 「対応中フラグ」は既存の`status`（新規/対応中/解決済み）とは異なる概念（誰が今見ているか）であり、混同しないデータ設計が必要。
- **Sources Consulted**: `src/types/inquiry.ts`、`.kiro/specs/helpdesk-portal-layout/design.md`（`Inquiry`型を変更しないという当該specの境界を確認）。
- **Findings**: `helpdesk-portal-layout`specの`Boundary Commitments`は「`Inquiry`型の形状変更をOut of Boundaryとする」としているが、これは同specの担当範囲内での話であり、後続spec（本spec）が新たな要件に基づいて型を拡張すること自体は妨げていない。対応中フラグはON/OFFの単純な状態であり、`Inquiry`に直接持たせるのが自然。対応履歴は1件の問い合わせに対して複数件発生する時系列データであり、`Inquiry`本体に埋め込むと一覧取得のペイロードが肥大化するため、別ストア・別APIとして分離するのが妥当。
- **Implications**: `Inquiry`型に`claim?: { staffName: string; claimedAt: string } | null`を追加する（既存フィールドは変更しない、後方互換な追加）。対応履歴は新規`InquiryHistoryEntry`型・別モックストアとして`inquiryId`で関連付ける。

### 申請者側画面への情報漏洩防止
- **Context**: `claim`（対応中フラグ）や対応履歴はヘルプデスク内部の情報であり、申請者側画面に表示されてはならない。
- **Sources Consulted**: `src/components/features/inquiry-list/InquiryDetail.tsx`、`src/components/features/dashboard/RecentInquiriesWidget.tsx`。
- **Findings**: 申請者側の既存コンポーネントは`Inquiry`オブジェクトを丸ごと展開せず、`category`・`urgency`・`status`等の個別フィールドのみを明示的に参照して表示している。`claim`フィールドを追加しても、これらのコンポーネントを変更しない限り自動的に表示されることはない。
- **Implications**: 申請者側コンポーネントの実装は変更しないことをこのspecの制約として明記し、レビュー時に「`claim`・履歴を新たに表示するようになっていないか」を確認観点とする。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. Server Actions + モジュールスコープの可変ストア（採用） | `"use server"`関数がモックAPIの可変配列を直接更新し、`revalidatePath`で関連ルートを再検証する | 実装がNext.js標準機能のみで完結、一覧⇔詳細の状態同期が自然に実現できる | 開発サーバー再起動でデータがリセットされる（フェーズ1のモックとして許容範囲） | 既存`createInquiry`とは異なる新パターンだが、本spec内の変更系操作に限定して導入する |
| B. 既存パターン踏襲（クライアントから直接モック関数を呼ぶだけで非永続） | `createInquiry`と同様、呼び出し元コンポーネント内の状態のみ更新 | 実装の一貫性を保てる | 一覧に戻ると変更が消える。対応中フラグ・履歴・ステータス変更・テンプレート管理のいずれも「変更が残る」ことが要件の前提のため機能として成立しない | 却下 |

## Design Decisions

### Decision: 変更系操作をServer Actionsで実装する
- **Context**: 対応中フラグ・ステータス変更・返信送信・テンプレート管理はいずれも変更の永続（プロセス内）が必要
- **Alternatives Considered**:
  1. 既存の`createInquiry`と同じ非永続パターン（Option B）
  2. Server Actions + モジュールスコープの可変ストア（Option A）
- **Selected Approach**: Option A。`src/lib/actions/helpdesk.ts`に`"use server"`関数群を定義し、`src/lib/api/`配下の可変モックストアを更新後、`revalidatePath`で一覧・詳細ルートを再検証する
- **Rationale**: 要件（対応中フラグ・履歴・ステータス変更・テンプレート管理の全て）が「変更後も状態が残る」ことを前提としており、Next.js標準機能の範囲で最も素直に実現できる
- **Trade-offs**: 開発サーバーの再起動でモックデータがリセットされる。既存`createInquiry`との非一貫性が生じるが、影響範囲は本spec配下の新規操作に限定される
- **Follow-up**: フェーズ3で実バックエンドに移行する際、Server Action内部の呼び出し先をモックストアから実APIへ差し替える

### Decision: `Inquiry`型への`claim`フィールド追加、対応履歴は別ストア
- **Context**: 対応中フラグと対応履歴のデータ設計
- **Alternatives Considered**:
  1. 対応中フラグ・履歴の両方を`Inquiry`型に埋め込む
  2. 対応中フラグのみ`Inquiry`型に追加し、履歴は別ストア・別型で分離する
- **Selected Approach**: 2
- **Rationale**: 対応中フラグは1問い合わせにつき高々1状態のシンプルな値だが、履歴は時系列で複数件発生するため、一覧取得時のペイロード肥大化を避けるために分離する
- **Trade-offs**: 詳細画面では`Inquiry`取得と履歴取得の2回のデータ取得が必要になるが、Server Componentでの並行取得（`Promise.all`）で吸収できる
- **Follow-up**: フェーズ3で実DBに移行する際、履歴テーブルは`Inquiry`と1:N関係の別テーブルとして自然に対応する

## Risks & Mitigations
- 開発サーバー再起動でクレーム・履歴・テンプレートの変更が消える — フェーズ1のモック制約として`design.md`に明記し、レビュー時の混乱を防ぐ
- `Inquiry`型に`claim`を追加したことで、既存の申請者側コンポーネントが将来誤って表示してしまうリスク — 申請者側コンポーネントを変更しないことを本specの制約とし、`/kiro:review-impl`のi18n/正確性観点で申請者側画面に新規フィールドが露出していないか確認する
- Server Actionsの`revalidatePath`はロケール付きの動的パス（`/[locale]/helpdesk/inquiries/[id]`）を扱うため、パス指定を誤ると再検証が効かず古い表示が残る — 実装時に一覧・詳細の両方を確実に再検証対象に含める

## References
- 既存実装: `src/lib/api/inquiries.ts`, `src/types/inquiry.ts`, `.kiro/specs/helpdesk-portal-layout/design.md`

---

## 追加ラウンド（2026-07-03）: 添付ファイル対応

### Summary
- **Discovery Scope**: Extension（`inquiry-form`specが確立した添付ファイルの型・上限定数・検証ユーティリティ・`AttachmentField`コンポーネントを読み取り専用で再利用する）
- **Key Findings**:
  - `src/lib/actions/helpdesk.ts`は全関数に`"use server"`が付与された正真正銘のServer Actionであり、`inquiry-form`の`createInquiry`（Server Actionではない素の関数）とは異なり、Next.jsのServer Action呼び出し境界（HTTPリクエストに相当するペイロード転送）を通過する
  - Next.js 14のServer Actionsはデフォルトでリクエストボディサイズの上限が**1MB**（`experimental.serverActions.bodySizeLimit`の既定値）。`inquiry-form`specで決定した添付ファイルの上限（1件5MB・最大5件、Base64データURL化で約1.33倍）をそのまま返信の添付にも適用すると、理論上最大約34MBのペイロードになり、デフォルト上限を大きく超えて`sendInquiryReplyAction`が失敗する
  - `next.config.mjs`には現在`experimental.serverActions`の設定が存在しない（デフォルト適用中）

### Requirement-to-Asset Map
| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件12 添付ファイル対応 | `AttachmentField`・`InquiryAttachment`型・上限定数・検証ユーティリティ（`inquiry-form`spec） | Missing（統合のみ） | UI・型・検証ロジックは流用可能。返信フォームへの組み込み、`InquiryHistoryEntry`への添付フィールド追加、詳細画面・履歴タイムラインでの表示、Server Actionのボディサイズ上限緩和が必要 |

### Design Decisions

#### Decision: `next.config.mjs`の`experimental.serverActions.bodySizeLimit`を明示的に引き上げる
- **Context**: `sendInquiryReplyAction`がServer Actionである以上、デフォルトの1MBボディサイズ上限では`inquiry-form`specで決めた添付ファイル上限（最大約34MB相当）を送信できない
- **Alternatives Considered**:
  1. 返信の添付ファイルにより厳しい独自の上限（例: 1件1MB・1件のみ）を設ける
  2. `next.config.mjs`で`bodySizeLimit`を引き上げ、`inquiry-form`と同一の上限をそのまま適用する
- **Selected Approach**: 2。`bodySizeLimit`を`"40mb"`に設定する（最大理論値・約34MBに安全マージンを加えた値）
- **Rationale**: 添付ファイルの制約をアプリ全体で一貫させるという`inquiry-form`spec設計時の方針（`AttachmentField`の共有）と整合する。返信側だけ独自の厳しい上限を設けると、同じコンポーネント・同じヒント文言（「1件5MBまで、最大5件まで」）を使っているのに実際には送信できないという不整合なUXになる
- **Trade-offs**: サーバー側で受け付け可能なリクエストサイズが全体的に大きくなるが、フェーズ1のモック環境（単一プロセス、認証なし）では実害は限定的。フェーズ3で実バックエンドに移行する際は、実際のインフラ制約に応じて再検討する
- **Follow-up**: フェーズ3移行時に、CDN・ロードバランサ等のインフラ側のボディサイズ制限も含めて再検討する

#### Decision: 添付ファイルの読み取り専用プレビュー・ダウンロードコンポーネントを本specが新設し、`inquiry-list`spec（次ラウンド）が読み取り専用で再利用する
- **Context**: 問い合わせ本文の添付ファイル・返信の添付ファイルを「選択・編集」ではなく「一覧表示・ダウンロード」する場面が、ヘルプデスク側詳細画面（本spec）と申請者側詳細画面（`inquiry-list`spec、次ラウンド）の両方で必要になる。`AttachmentField`（`inquiry-form`所有）は選択・削除操作を持つ編集用コンポーネントであり、読み取り専用の表示には過剰かつ不適合（削除ボタンが表示されてしまう等）
- **Alternatives Considered**:
  1. `AttachmentField`に読み取り専用モード（`readOnly`prop）を追加する
  2. 読み取り専用の新規コンポーネント（`AttachmentPreviewList`）を新設する
- **Selected Approach**: 2。`src/components/features/helpdesk-inquiries/AttachmentPreviewList.tsx`として新設し、`InquiryAttachment[]`を受け取ってサムネイル/ファイル名・サイズとダウンロードリンクを表示する
- **Rationale**: `AttachmentField`に条件分岐を増やすより、責務が単純な専用コンポーネントを新設する方が見通しが良い。このコードベースでは`FormField`（`inquiry-form`所有）が`helpdesk-announcements`等の他機能から既に再利用されている前例があり、「後続specが必要とするコンポーネントを、最初に必要になったspecが所有し、後続specが読み取り専用で再利用する」という設計パターンは既に確立している
- **Trade-offs**: `inquiry-list`spec（次ラウンド）は`helpdesk-inquiries`フォルダ配下のコンポーネントに依存することになるが、既存の`FormField`の前例と同じパターンであり許容する
- **Follow-up**: `inquiry-list`spec着手時に、`AttachmentPreviewList`の翻訳文言がpropsとして受け取る設計（`FormField`と同じ規約）になっていることを確認する

---

## 追加ラウンド（2026-07-07）: 問い合わせ本文の日本語訳表示

### Summary
- **Discovery Scope**: Extension（`inquiry-form`spec側で既に型定義済みだが未使用の`Inquiry.translatedText`フィールドを利用し、表示配線とフェーズ1モックデータの値追加のみを行う）
- **Key Findings**:
  - `src/types/inquiry.ts`の`Inquiry.translatedText?: string`は既に存在し、コメントに「日本語訳。フェーズ3（Amazon Translate連携）まで未使用」とある。型定義自体は`inquiry-form`spec側の既存資産であり、本ラウンドで型変更は発生しない
  - `.kiro/steering/tech.md`は自由記述の翻訳処理について「Google Cloud Translation API連携はフェーズ3で対応する」と明記しており、`inquiry.ts`のコメント（Amazon Translate）と翻訳サービス名の記載がわずかに揺れているが、いずれも「フェーズ3まで実際のAPI連携は行わない」という結論は一致している。本ラウンドはこの前提を変更しない
  - `CreateInquiryInput`型は`Omit<Inquiry, id | translatedText>`で定義されており、`translatedText`は申請フォーム送信時の入力から既に除外されている（申請者が翻訳結果を入力する余地はない設計）
  - `src/lib/api/inquiries.ts`の`MOCK_INQUIRIES`（`inquiry-list`spec起源の静的モック配列）には現在`translatedText`の値が1件も設定されていない。`originalLanguage`が`ja`以外の要素（`en`/`ko`/`zh`/`vi`）にダミーの日本語訳を追加する必要がある
  - `HelpdeskInquiryDetail.tsx`は現在`inquiry.originalText`をそのまま表示するのみで、`translatedText`・`originalLanguage`のいずれも参照していない

### Requirement-to-Asset Map
| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件13 日本語訳表示 | `Inquiry.translatedText`（型定義済み・値未設定、`inquiry-form`spec） | Missing（値・表示配線のみ） | 型は既存のまま利用可能。モックデータへの値追加と`HelpdeskInquiryDetail`の表示分岐が必要 |

### Design Decisions

#### Decision: モックデータの日本語訳ダミー値は本spec（`helpdesk-inquiry-management`）側で`MOCK_INQUIRIES`に追加する
- **Context**: `translatedText`はヘルプデスク側の表示のみで使われるフィールドであり、値を用意する動機・利用者はいずれも本specに属する。一方`MOCK_INQUIRIES`配列自体は`inquiry-list`specが新設したファイル（`src/lib/api/inquiries.ts`）内に存在する
- **Alternatives Considered**:
  1. `inquiry-list`specに値追加を依頼し、本specは値追加後の`translatedText`を読むだけにする
  2. 本specが`MOCK_INQUIRIES`の既存要素に`translatedText`の値のみを直接追加する（フィールドの型・他の値は変更しない）
- **Selected Approach**: 2。既存の`claim`フィールド追加時と同様、本specが必要とする値をモックデータに直接追加する
- **Rationale**: `Inquiry`型への`claim`フィールド追加（本spec所有）の前例と同じく、モックデータへの値追加は「型のオーナーシップ」とは別次元の話であり、値を必要とする機能を実装するspecがその都度追加する運用がこのコードベースで既に確立している。他specへの依頼往復はフェーズ1のモック運用としては過剰
- **Trade-offs**: `inquiry-list`spec側が将来同じ配列に別の値を追加する際、本spec由来の`translatedText`値と衝突しないよう注意が必要だが、フィールドが異なるため実際の衝突リスクは低い
- **Follow-up**: なし

#### Decision: 日本語訳表示は既存の`HelpdeskInquiryDetail`内に条件分岐として実装し、新規コンポーネントは作らない
- **Context**: 表示ロジックは「`translatedText`が使えるときはそれをメイン表示し、原文を下に添える。使えないときは原文のみ」という単純な条件分岐であり、状態管理やインタラクションを持たない
- **Alternatives Considered**:
  1. 新規の`TranslatedInquiryBody`のような表示コンポーネントを新設する
  2. `HelpdeskInquiryDetail`内にインラインの条件分岐として実装する
- **Selected Approach**: 2。既存コンポーネント内に条件分岐を追加する
- **Rationale**: `AttachmentPreviewList`のように複数箇所（詳細画面・履歴タイムライン）から再利用される見込みがある場合は新規コンポーネント化するが、本ロジックは`HelpdeskInquiryDetail`の問い合わせ本文セクション1箇所のみで使われるため、コンポーネント分割の恩恵がない。過剰な抽象化を避ける
- **Trade-offs**: なし
- **Follow-up**: なし

---

## 追加ラウンド（2026-07-07・2）: 対応履歴への申請者メッセージの統合表示

### Summary
- **Discovery Scope**: Extension（本specが所有する`InquiryHistoryEntryType`に新種別を追加し、既存のヘルプデスク側タイムライン表示ロジックへの影響を最小化する）
- **Key Findings**:
  - `HistoryTimeline.tsx`（ヘルプデスク側）は`entry.type`に対する網羅的なswitch文を持たず、呼び出し元（`HelpdeskInquiryDetail`）が渡す`typeLabels: Record<InquiryHistoryEntryType, string>`のルックアップのみで種別ラベルを表示する設計になっている。そのため新種別`requester_message`を追加しても`HistoryTimeline`自体のコード変更は不要で、`HelpdeskInquiryDetail`側で`typeLabels`オブジェクトに1エントリ追加するだけで済む
  - 一方、`inquiry-list`spec側の`InquiryHistoryList.tsx`（申請者側）は`entry.type`に対する網羅的なswitch文（`never`型による網羅性チェック）を持っているため、`InquiryHistoryEntryType`に新種別を追加すると、`inquiry-list`側は新しい`case`分岐を追加しない限りコンパイルエラーになる。これは意図した安全装置であり、型を拡張する本specは、依存する`inquiry-list`specへの影響を必ず周知する必要がある
  - `entry.actorName`は全種別で必須フィールドであり、`requester_message`エントリにも値が必要。個人名を持たない申請者側は`Inquiry.submittedBy.companyName`を代わりに格納する方針とした（要件定義時に決定済み）

### Requirement-to-Asset Map
| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件14 対応履歴への申請者メッセージの統合表示 | `InquiryHistoryEntryType`・`HistoryTimeline`（本spec所有・既存） | Missing（型追加・表示配線のみ） | 型に1種別追加し、`HelpdeskInquiryDetail`の`typeLabels`に1行追加するだけで対応可能。`HistoryTimeline`自体は変更不要 |

### Design Decisions

#### Decision: `HistoryTimeline`はtypeLabelsルックアップ方式のため変更不要とし、`HelpdeskInquiryDetail`側のみを変更する
- **Context**: 新種別の追加が既存コンポーネントにどこまで影響するかを確認する必要があった
- **Alternatives Considered**: 1) `HistoryTimeline`に`requester_message`専用の表示分岐を追加する、2) 既存のtypeLabelsルックアップ方式のまま`HelpdeskInquiryDetail`側でラベルを1行追加するだけにする
- **Selected Approach**: 2
- **Rationale**: `HistoryTimeline`の設計は元々「ラベル文字列 + actorName + detail + attachments」という共通フォーマットで全種別を表示する汎用設計であり、`requester_message`もこのフォーマットに自然に収まる。既存コンポーネントへの変更を避けられる
- **Trade-offs**: なし
- **Follow-up**: なし
