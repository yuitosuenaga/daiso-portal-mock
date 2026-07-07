# リサーチ・設計決定ログ: inquiry-list

## Gap Analysis（`/kiro:validate-gap` 実施結果）

### Summary

- **Feature**: `inquiry-list`
- **Discovery Scope**: Extension（既存ブラウンフィールド。ルート・型は用意済みだが、一覧表示用のモックデータそのものが存在しない）
- **Key Findings**:
  - `/inquiry`ルートとサイドバー導線は`dashboard`仕様で用意済みで、現在は`PlaceholderPage`を表示しているのみ
  - `types/inquiry.ts`の`Inquiry`型は本仕様が必要とするフィールド（`category`/`urgency`/`storeRegion`/`status`/`createdAt`/`submittedBy`等）を既に満たしており、型定義の変更・追加は不要
  - **重要な発見**: `lib/api/inquiries.ts`の`createInquiry`は送信された`CreateInquiryInput`にIDを付与して返すだけで、**どこにも永続化していない**（配列等への追記なし）。そのため「自社が送信した問い合わせ」を表示するための元データが現状存在しない。ユーザー確認の結果、`announcements`/`links-page`と同様に**ダミーの静的モックデータを新規に用意する**方針で問題ないことを確認済み
  - `getInquiryStatusSummary`（ダッシュボードウィジェット用、`new: 3, in_progress: 7, resolved: 42`の固定値）とは別のデータセットとして扱う想定。新規に用意する一覧用モックデータの件数・内訳をこの集計値に厳密に一致させる必要性は要件上ない（別画面・別関心事のため）
  - `components/ui/badge.tsx`（`announcements`仕様で追加）は現在`variant`が`maintenance`/`policy`/`incident`/`other`という`AnnouncementCategory`固有のキーに限定されている。本仕様が必要とする対応状況（`new`/`in_progress`/`resolved`）・緊急度（`high`/`medium`/`low`）の視覚的区別には、そのままでは使えない
  - `structure.md`のディレクトリ構成案・`product.md`の実装推奨順序に`inquiry-list`が記載されていなかったため、本spec-init時に両方を修正済み

---

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件1 一覧ページ・アクセス | `/inquiry/page.tsx`（Placeholder）、サイドバー導線 | Missing | ルーティング・導線は完成済み。一覧本体の実装のみ不足 |
| 要件2 表示順序・視覚的区別 | なし | Missing | 対応状況・緊急度を区別する表示コンポーネントが未整備 |
| 要件3 状態表示 | `AnnouncementList`/`LinkList`のローディング/エラー/空状態パターン | Missing（パターンは既存） | 同パターンを再利用して実装する必要がある |
| 要件4 詳細表示 | `AnnouncementDetail`の動的ルートパターン（`/announcements/[id]`） | Missing | `/inquiry/[id]`を新規作成する必要がある |
| 要件5 モックAPI連携 | `lib/api/inquiries.ts`（`createInquiry`・`getInquiryStatusSummary`のみ） | Missing / Constraint | 既存2関数は`inquiry-form`仕様が所有し変更不可。新規関数（`getInquiries`・`getInquiryById`）と、それらが参照する静的モックデータ配列を追加する必要がある |
| 要件6 多言語対応 | `messages/*.json`の構造・フォールバック設定済み | Constraint（軽微） | `inquiryList`名前空間を新規追加するだけで対応可能 |
| 要件7 レスポンシブ | 既存仕様のブレークポイント方針 | Constraint（軽微） | 既存方針を適用するだけで対応可能 |

---

### Implementation Approach Options

#### Option A: 既存ファイルの拡張のみで対応
- `inquiry/page.tsx`に一覧ロジックを直接実装
- ❌ `structure.md`が想定する`components/features/inquiry-list/`構成から逸脱

#### Option B: 新規コンポーネント群として構築（Badgeは触らない）
- `src/components/features/inquiry-list/`に一覧・詳細・状態表示用の小コンポーネントを新規作成
- 対応状況・緊急度の視覚的区別は、共有の`Badge`プリミティブを使わず、本機能専用のローカルな表示コンポーネント（Tailwindクラス直書き）で対応
- ✅ 既存の`Badge`（`announcements`仕様が導入）に一切影響を与えない
- ❌ バッジ的な見た目のスタイリングが`Badge`と`inquiry-list`独自コンポーネントの2箇所に分散し、将来的な見た目の一貫性維持コストが増える

#### Option C: 新規コンポーネント群として構築 + Badgeを加法的に拡張（推奨）
- `src/components/features/inquiry-list/`に一覧・詳細を新規作成
- `components/ui/badge.tsx`の`variant`に、既存の`maintenance`/`policy`/`incident`/`other`を**変更せず**、対応状況・緊急度用の新しいキー（例: `new`/`in_progress`/`resolved`/`urgency-high`/`urgency-medium`/`urgency-low`、命名は設計フェーズで確定）を追加する
- ✅ サイト全体でバッジの視覚言語が一貫する。既存の`announcements`利用箇所には影響を与えない（加法的変更のみ）
- ❌ `Badge`という汎用UIプリミティブに複数機能のドメイン固有のキーが集まり、将来的にキー数が増えすぎる可能性がある（現時点では2機能・実質7〜10キー程度なので許容範囲と判断）

**推奨**: Option C。`Badge`は`components/ui/`配下の汎用プリミティブという位置づけであり、既存キーを変更しない加法的拡張であればリスクは低い。

---

### Effort & Risk

- **Effort**: **M（3〜5日）** — 一覧・詳細画面の実装自体は`announcements`と同規模だが、ダミーモックデータの作成（一覧に足る件数・内容の`Inquiry`データを新規に用意する）と、`Badge`の拡張検討が追加で発生する
- **Risk**: **Low** — 新規の外部依存はなく、既存パターン（`AnnouncementList`/`AnnouncementDetail`の「async Server Component + try/catch + Suspense/Skeleton」）を再利用できる。唯一の設計判断は`Badge`拡張の方針決定

---

### Recommendations for Design Phase

- **推奨アプローチ**: Option C
- **主要な決定事項**:
  1. ダミーモックデータの件数・内容（対応状況・緊急度・案件種別が一通り確認できる程度の件数、目安5〜10件程度）
  2. `Badge`に追加する対応状況・緊急度用のvariantキーの具体的な命名
  3. 詳細画面のレイアウト（`AnnouncementDetail`をベースに、自由記述本文・申請者情報をどの順序・粒度で表示するか）
- **Research Needed**: 特になし（新規ライブラリ・外部API連携が発生しないため、軽量な調査で十分）

---

## 設計フェーズでの決定（Light Discoveryの結論）

### Design Decisions

#### Decision: 案件種別・緊急度・国の表示ラベルは`inquiryForm`名前空間の既存翻訳キーを再利用する
- **Context**: `messages/ja.json`/`en.json`を確認したところ、`inquiryForm.options.category`/`urgency`/`country`/`originalLanguage`が`inquiry-form`仕様実装時に既に整備されていることを発見した
- **Alternatives Considered**: 1) `inquiryList`名前空間に案件種別・緊急度・国のラベルを重複して追加する、2) 既存の`inquiryForm.options.*`を読み取り専用で再利用する
- **Selected Approach**: 2) 既存キーを再利用する
- **Rationale**: 同じ値（`defect`/`high`/`JP`等）に対する表示ラベルが2箇所に分散すると、将来の翻訳更新時に片方だけ更新され表示不整合を起こすリスクがある。DRY原則に従い単一のソースを参照する
- **Trade-offs**: `inquiry-list`の翻訳が`inquiry-form`の翻訳キー構造に依存するため、`inquiry-form`側のキー名変更時は`inquiry-list`側も追随が必要（`Revalidation Triggers`に明記済み）
- **Follow-up**: なし

#### Decision: `Badge`に対応状況・緊急度用のvariantを加法的に追加する
- **Context**: 対応状況（new/in_progress/resolved）・緊急度（high/medium/low）を視覚的に区別する必要があるが、既存の`Badge`は`AnnouncementCategory`固有のキーのみを持つ
- **Alternatives Considered**: 1) 本機能専用のローカルな表示コンポーネントを新規作成する、2) 既存の`Badge`を既存キーを変更せず加法的に拡張する
- **Selected Approach**: 2) `Badge`を加法的に拡張する（`status-new`/`status-in_progress`/`status-resolved`/`urgency-high`/`urgency-medium`/`urgency-low`を追加）
- **Rationale**: `Badge`はサイト全体の汎用UIプリミティブという位置づけであり、加法的な変更であれば既存の`announcements`利用箇所に影響を与えない。バッジの視覚言語をサイト全体で一貫させられる
- **Trade-offs**: `Badge`のvariantキー数が増える。将来的に機能が増えるとキー管理が煩雑になる可能性があるが、現時点（2機能・10キー程度）では許容範囲
- **Follow-up**: 3機能目以降でバッジのバリエーションが必要になった場合、ドメインごとのラッパーコンポーネント化を検討する

#### Decision: 一覧用の静的モックデータは5〜10件程度、ダッシュボードの集計値とは独立させる
- **Context**: `getInquiryStatusSummary`は固定値（new: 3, in_progress: 7, resolved: 42）を返すが、これと一覧データの件数を一致させる必要があるか判断が必要だった
- **Alternatives Considered**: 1) 集計値と厳密に一致させる（52件のモックデータが必要）、2) 独立した少数のダミーデータとする
- **Selected Approach**: 2) 独立した少数のダミーデータとする（ユーザー確認済み）
- **Rationale**: 両者は別画面・別関心事であり、フェーズ1のモックとして厳密な整合性を持たせる必要性は要件上ない。少数（5〜10件）で対応状況・緊急度・案件種別が一通り確認できれば十分
- **Trade-offs**: ダッシュボードの集計数値と一覧の件数が一致しないため、実データ的な違和感を指摘される可能性があるが、フェーズ1のモックである旨は`product.md`で明示されている
- **Follow-up**: フェーズ3で実APIに移行する際は、集計APIと一覧APIが同一データソースを参照する設計にする

---

## 追加ラウンド（2026-07-03）: 対応履歴・返信内容の表示

### Summary

- **Feature**: `inquiry-list`（既存spec更新。新規spec作成ではなく、要件8・9を追加）
- **Discovery Scope**: Extension（既存の`helpdesk-inquiry-management`specが提供するデータ・APIを、本specの画面から読み取り専用で消費する）
- **Key Findings**:
  - `getInquiryHistory(inquiryId): Promise<InquiryHistoryEntry[]>`（`lib/api/inquiry-history.ts`、`helpdesk-inquiry-management`spec所有）は発生時刻降順で該当問い合わせの全履歴を返す既存関数で、変更不要にそのまま利用できる
  - `sendInquiryReplyAction`が記録する`reply_sent`エントリの`detail`には返信本文が**そのまま全文**保存されている（要約ではない）。`changeInquiryStatusAction`が記録する`status_changed`エントリの`detail`は`inquiryList.status`翻訳キー経由で**既に localize 済み**の「旧 → 新」文字列（例:「新規 → 解決済み」）になっている。`claimed`/`released`エントリは`detail`を持たない
  - `HistoryTimeline`（`helpdesk-inquiries`機能配下）は既存コンポーネントだが、常に`actorName`を表示する設計であり、本specの要件（担当者名を一切表示しない）を満たさない。共有せず、本spec専用の新しい表示コンポーネントを追加する
  - `Inquiry.claim`（`{ staffName, claimedAt } | null`）は`helpdesk-inquiry-management`spec所有のフィールドで、`getInquiryById`が返す`Inquiry`に既に含まれている。担当者名（`staffName`）を除いた「対応中かどうか」の真偽のみを画面側で利用する
  - `components/ui/badge.tsx`には対応中バッジに転用できる専用variantがないため、既存の`accent`系の見た目（`status-in_progress`と同系統）を流用する

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件8 対応履歴・返信内容の表示 | `getInquiryHistory`（`helpdesk-inquiry-management`spec） | Missing（表示側のみ） | データ取得APIは既存のまま利用可能。申請者向けの表示コンポーネントが未整備 |
| 要件9 対応中状態バッジ | `Inquiry.claim`（`helpdesk-inquiry-management`spec） | Missing（表示側のみ） | データは`getInquiryById`から既に取得できている。バッジ表示のみ追加 |

### Implementation Approach Options

#### Option A: 既存の`HistoryTimeline`（helpdesk側）をpropsで制御して共有する
- `showActorName`のようなフラグを追加し、申請者側・ヘルプデスク側の両方から利用する
- ❌ `HistoryTimeline`は`helpdesk-inquiry-management`spec所有のコンポーネントであり、本spec都合で改修すると所有specの境界を越える。表示要件（返信ラベルの強調、`claimed`/`released`の文言）も申請者側とヘルプデスク側で異なり、フラグ分岐が増えて複雑化する

#### Option B: 本spec専用の新規表示コンポーネントを追加する（推奨）
- `src/components/features/inquiry-list/InquiryHistoryList.tsx`を新規追加し、`InquiryHistoryEntry[]`を受け取って申請者向けに整形表示する
- データ取得関数（`getInquiryHistory`）・型（`InquiryHistoryEntry`）は`helpdesk-inquiry-management`spec所有のまま読み取り専用で利用し、変更しない
- ✅ 所有権の境界を侵さず、表示ロジックの重複はコンポーネント1つ分に限定される。ヘルプデスク側の表示要件変更が申請者側に波及しない
- ❌ 履歴の整形ロジック（種別ごとの文言分岐）が2箇所（`HistoryTimeline`と`InquiryHistoryList`）に存在することになるが、両者の表示要件（担当者名の有無等）が本質的に異なるため許容する

**推奨**: Option B。

### Effort & Risk

- **Effort**: **S（1〜2日）** — 新規データ取得・型定義は不要で、既存`InquiryDetail`への表示追加とテストが主な作業
- **Risk**: **Low** — 新規の外部依存・データモデル変更なし。唯一のリスクは`claimed`/`released`の文言が「対応が完了した」という誤解を招かないよう明確に書き分けること

### Recommendations for Design Phase

- **推奨アプローチ**: Option B
- **主要な決定事項**: `claimed`/`released`の申請者向け文言（`status`の`resolved`と混同されない表現にする）、対応中バッジのvariant

---

## 設計フェーズでの決定（追加ラウンド）

### Design Decisions

#### Decision: `released`（対応解除）の文言は「対応完了」を連想させない中立的な表現にする
- **Context**: `released`は担当者が対応中フラグを外した（二重対応防止の解除）だけで、問い合わせが解決したことを意味しない。要件定義時の例示文言「対応が完了しました」をそのまま使うと、既存の`status`（新規/対応中/解決済み）と意味が混同される
- **Alternatives Considered**: 1) 要件定義の例示通り「対応が完了しました」とする、2) 「対応中の状態を解除しました」という中立的な表現にする
- **Selected Approach**: 2) 「対応中の状態を解除しました」（`claimed`は「対応中になりました」）
- **Rationale**: `resolved`ステータスへの変更は`status_changed`エントリが別途担当するため、`released`の文言は状態解除の事実のみを伝えれば十分。「完了」という語を避けることで、対応状況（`status`）バッジとの意味の混同を避ける
- **Trade-offs**: なし
- **Follow-up**: なし

#### Decision: 対応中バッジは`status-in_progress`と同系統の見た目（`accent`）を再利用する
- **Context**: 対応中フラグ用の専用variantは`Badge`にまだ存在しない
- **Alternatives Considered**: 1) 新規variant（例: `claim-active`）を追加する、2) 既存の`status-in_progress`と同じ見た目を`variant="status-in_progress"`として転用する
- **Selected Approach**: 2) 既存の`status-in_progress`variantをそのまま転用する
- **Rationale**: 対応中フラグも対応状況の「進行中」も概念的に近い状態であり、視覚的に同系統の色で表現することは自然。新規variant追加のコストを避けられる
- **Trade-offs**: `status-in_progress`という名前がやや対応状況（`status`）専用に見えるが、`Badge`のvariant名は見た目のトークンであり意味的な排他性はないため許容する
- **Follow-up**: なし

---

## 追加ラウンド（2026-07-07）: 添付ファイルの表示

### Summary

- **Feature**: `inquiry-list`（既存spec更新。新規spec作成ではなく、要件10を追加）
- **Discovery Scope**: Extension（`inquiry-form`・`helpdesk-inquiry-management`両specが既に提供する型・コンポーネントを、本specの画面から読み取り専用で消費する）
- **Key Findings**:
  - `Inquiry.attachments?: InquiryAttachment[]`（`types/attachment.ts`、`inquiry-form`spec所有）は既にデータモデル上存在し、`getInquiryById`・`getInquiries`が返す`Inquiry`にそのまま含まれている
  - `InquiryHistoryEntry.attachments?: InquiryAttachment[]`（`types/inquiry-history.ts`、`helpdesk-inquiry-management`spec所有）も同様に既存で、`getInquiryHistory`が返す`reply_sent`エントリに含まれ得る
  - `AttachmentPreviewList`（`src/components/features/helpdesk-inquiries/AttachmentPreviewList.tsx`、`helpdesk-inquiry-management`spec所有）は`attachments: InquiryAttachment[]`のみを受け取る読み取り専用の汎用コンポーネントで、`inquiryId`等の文脈に依存しない設計。コンポーネント自身のコメントに「`inquiry-list`spec次ラウンドでの再利用に備える」と明記されており、まさに本ラウンドの対応を見越して設計済みであることを確認した
  - `AttachmentPreviewList`は`attachments.length === 0`の場合に`null`を返す設計のため、呼び出し側（`InquiryDetail`・`InquiryHistoryList`）で「0件なら非表示」の分岐を別途実装する必要がない
  - `InquiryHistoryList.tsx`の`renderEntryContent`（`reply_sent`分岐）は現状`entry.detail`のみを表示しており、`entry.attachments`を読んでいないことを確認した。他の3種別（`status_changed`/`claimed`/`released`）には`attachments`フィールド自体が存在しないため対象外

### Requirement-to-Asset Map

| 要件 | 既存アセット | ギャップ区分 | 内容 |
|---|---|---|---|
| 要件10 添付ファイルの表示 | `Inquiry.attachments`・`InquiryHistoryEntry.attachments`・`AttachmentPreviewList`（いずれも既存） | Missing（表示配線のみ） | データ・コンポーネントは既存のまま利用可能。`InquiryDetail`・`InquiryHistoryList`からの呼び出し配線のみ未整備 |

### Implementation Approach Options

#### Option A: `AttachmentPreviewList`を再利用する（推奨）
- `InquiryDetail`の問い合わせ本文セクション・`InquiryHistoryList`の`reply_sent`分岐から、既存の`AttachmentPreviewList`をそれぞれ呼び出す
- ✅ 新規コンポーネント不要。`helpdesk-inquiry-management`spec側の表示ロジック変更が本specに波及しない読み取り専用の依存関係のみで済む
- ❌ なし（既存コンポーネントが汎用設計のため、トレードオフは実質ない）

#### Option B: 本spec専用の添付ファイル表示コンポーネントを新規作成する
- `InquiryHistoryList`の`HistoryTimeline`との関係と同様に、独自の表示コンポーネントを新規実装する
- ❌ `AttachmentPreviewList`は既に文脈に依存しない汎用設計であり、`HistoryTimeline`（常に`actorName`を表示し要件に合わない）とは事情が異なる。重複実装の理由がない

**推奨**: Option A。

### Effort & Risk

- **Effort**: **XS（半日〜1日）** — 新規データ取得・型定義・コンポーネント実装が不要で、既存`InquiryDetail`・`InquiryHistoryList`への呼び出し追加とテストのみ
- **Risk**: **Low** — 新規の外部依存・データモデル変更なし。既存コンポーネントの契約（props）を変更しないため、`helpdesk-inquiry-management`側への影響もない

### Recommendations for Design Phase

- **推奨アプローチ**: Option A
- **主要な決定事項**: `InquiryDetail`内での添付ファイル欄の表示位置（自由記述の直後）、`InquiryHistoryList`内での添付ファイル欄の表示位置（返信本文の直後）
- **Research Needed**: 特になし

---

## 設計フェーズでの決定（追加ラウンド・2026-07-07）

### Design Decisions

#### Decision: `AttachmentPreviewList`をそのまま再利用し、新規の表示コンポーネントを作らない
- **Context**: 添付ファイルの表示が必要な箇所（問い合わせ本文・返信履歴）は2箇所あるが、いずれも表示要件（画像サムネイル・ファイル名・サイズ・ダウンロードリンク）は同一
- **Alternatives Considered**: 1) `helpdesk-inquiry-management`spec所有の`AttachmentPreviewList`を読み取り専用で再利用する、2) 本spec専用の表示コンポーネントを新規作成する
- **Selected Approach**: 1) `AttachmentPreviewList`を再利用する
- **Rationale**: 同コンポーネントは`inquiryId`等の文脈に依存しない汎用設計として既に実装されており、まさにこのような再利用を想定してコメントに明記されている。重複実装を避けることで、将来の表示仕様変更（例: サムネイルサイズの調整）が1箇所で完結する
- **Trade-offs**: 本specは`AttachmentPreviewList`の実装詳細（`helpdesk-inquiry-management`spec所有）に依存するため、同specがpropsの契約を破壊的に変更した場合は本specの表示にも影響する（`Revalidation Triggers`に明記済み）
- **Follow-up**: なし
