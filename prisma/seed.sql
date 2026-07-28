--
-- prisma/seed.ts と同内容のデモデータ（会社8社・申請者/ヘルプデスクアカウント各1・
-- 問い合わせ11件（seed-inquiry-001 + inquiry-001〜010の多様なサンプル）・
-- お知らせ6件（公開開始日が未来のデモデータ1件を含む）+担当者16名+確認状況47件・
-- ドキュメントカテゴリ4件（大分類3・中分類1）・ドキュメント5件・FAQ12件・
-- リンク11件・返信テンプレート7件）を
-- DBeaver等のSQLエディタから直接投入するためのデータのみのSQLファイル
-- （pg_dump --data-only --inserts --column-inserts --exclude-table=_prisma_migrations で生成）。
--
-- 前提: 対象DBに `prisma migrate deploy` でスキーマ（テーブル）が適用済みであること。
-- スキーマ自体はこのファイルには含まれない（Prismaマイグレーションが正とする）。
-- ログインアカウント: applicant@daiso-vietnam.example.com / staff@helpdesk.example.com
--   いずれもパスワードは password1234（bcryptハッシュ済み）。
--
-- 使い方（ローカル・Cloud SQLどちらも同じ）:
--   DBeaverでDB接続 → SQLエディタでこのファイルを開く → 全体実行
--   （既に同一IDのレコードが存在する場合は一意制約違反になるため、
--    空のDB、または対象テーブルを空にした状態で実行すること）
--

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries", "dueDate", "publishEndDate", "publishStartDate", "createdAt", status, "updatedAt") VALUES ('seed-announcement-001', 'システムメンテナンスのお知らせ（7月15日 2:00〜4:00）', '2026年7月15日 2:00〜4:00の間、システムメンテナンスを実施いたします。メンテナンス中はポータルサイトにアクセスできませんのでご注意ください。ご不便をおかけしますが、何卒ご理解のほどよろしくお願いいたします。', 'maintenance', '2026-07-01 09:00:00', true, 'all', '{}', '2026-07-14', NULL, NULL, '2026-07-28 03:26:06.496', 'published', '2026-07-28 03:26:06.496');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries", "dueDate", "publishEndDate", "publishStartDate", "createdAt", status, "updatedAt") VALUES ('seed-announcement-002', '新しいFAQページを追加しました', 'よくあるお問い合わせをまとめたFAQページを新設しました。お問い合わせの前にぜひご活用ください。今後も内容を随時更新してまいります。', 'other', '2026-06-28 09:00:00', false, 'all', '{}', NULL, '2026-12-31', NULL, '2026-07-28 03:26:06.503', 'published', '2026-07-28 03:26:06.503');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries", "dueDate", "publishEndDate", "publishStartDate", "createdAt", status, "updatedAt") VALUES ('seed-announcement-003', '問い合わせフォームの項目を更新しました', '問い合わせ・申請フォームの入力項目を一部更新しました。案件種別・緊急度の選択肢が変更されておりますので、ご利用の際はご確認ください。', 'policy', '2026-06-20 09:00:00', true, 'all', '{}', '2026-07-20', NULL, NULL, '2026-07-28 03:26:06.508', 'published', '2026-07-28 03:26:06.508');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries", "dueDate", "publishEndDate", "publishStartDate", "createdAt", status, "updatedAt") VALUES ('seed-announcement-004', '夏季休業期間のお知らせ（8月13日〜16日）', '誠に恐れ入りますが、8月13日〜16日は夏季休業期間とさせていただきます。休業期間中に受け付けた問い合わせは、休業明けに順次対応いたします。', 'other', '2026-06-15 09:00:00', false, 'all', '{}', NULL, NULL, NULL, '2026-07-28 03:26:06.512', 'published', '2026-07-28 03:26:06.512');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries", "dueDate", "publishEndDate", "publishStartDate", "createdAt", status, "updatedAt") VALUES ('seed-announcement-005', '決済システム障害の発生について', '本日未明、決済システムに障害が発生し、一部の処理が正常に完了しない事象が確認されました。現在は復旧しておりますが、影響を受けた処理については別途ご案内いたします。', 'incident', '2026-06-10 09:00:00', true, 'all', '{}', '2026-06-17', NULL, NULL, '2026-07-28 03:26:06.516', 'published', '2026-07-28 03:26:06.516');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries", "dueDate", "publishEndDate", "publishStartDate", "createdAt", status, "updatedAt") VALUES ('seed-announcement-006', '【公開予定】次期ポータル機能の事前案内', '公開開始日が未来に設定されたお知らせの動作確認用データです。海外販社側には公開開始日前は表示されません。', 'policy', '2026-07-08 09:00:00', false, 'all', '{}', NULL, NULL, '2099-01-01', '2026-07-28 03:26:06.523', 'published', '2026-07-28 03:26:06.523');


--
-- Data for Name: AnnouncementAttachment; Type: TABLE DATA; Schema: public; Owner: portal_mock
--



--
-- Data for Name: DocumentCategory; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."DocumentCategory" (id, "parentId", name, "displayOrder", "targetingScope", "targetingCountries", "targetingCompanyCodes", "createdAt", "updatedAt") VALUES ('seed-document-category-001', NULL, '店舗運営マニュアル', 0, 'all', '{}', '{}', '2026-07-28 03:26:06.612', '2026-07-28 03:26:06.612');
INSERT INTO public."DocumentCategory" (id, "parentId", name, "displayOrder", "targetingScope", "targetingCountries", "targetingCompanyCodes", "createdAt", "updatedAt") VALUES ('seed-document-category-001-child-001', 'seed-document-category-001', 'レジ操作', 0, 'all', '{}', '{}', '2026-07-28 03:26:06.621', '2026-07-28 03:26:06.621');
INSERT INTO public."DocumentCategory" (id, "parentId", name, "displayOrder", "targetingScope", "targetingCountries", "targetingCompanyCodes", "createdAt", "updatedAt") VALUES ('seed-document-category-002', NULL, '商品陳列・什器', 1, 'all', '{}', '{}', '2026-07-28 03:26:06.626', '2026-07-28 03:26:06.626');
INSERT INTO public."DocumentCategory" (id, "parentId", name, "displayOrder", "targetingScope", "targetingCountries", "targetingCompanyCodes", "createdAt", "updatedAt") VALUES ('seed-document-category-003', NULL, '内部監査資料', 2, 'companies', '{}', '{jp-daiso-japan-trading}', '2026-07-28 03:26:06.631', '2026-07-28 03:26:06.631');


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes", "googleEmbedUrl", "googleUrl", "sourceType", status, "categoryId", "subCategoryId") VALUES ('seed-document-001', '店舗運営マニュアル（共通版）', '全販社共通の店舗運営における基本ルールをまとめたマニュアルです。', 'store-operations-manual.pdf', 'application/pdf', 245760, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-07-01 09:00:00', 'all', '{}', '{}', NULL, NULL, 'upload', 'published', 'seed-document-category-001', NULL);
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes", "googleEmbedUrl", "googleUrl", "sourceType", status, "categoryId", "subCategoryId") VALUES ('seed-document-002', '商品陳列ガイドライン（東南アジア版）', '東南アジア地域向けの商品陳列レイアウトのガイドラインです。', 'merchandising-guideline-sea.pdf', 'application/pdf', 512000, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-25 09:00:00', 'countries', '{VN,TH,ID}', '{}', NULL, NULL, 'upload', 'published', 'seed-document-category-002', NULL);
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes", "googleEmbedUrl", "googleUrl", "sourceType", status, "categoryId", "subCategoryId") VALUES ('seed-document-003', 'レジ操作マニュアル（ベトナム限定）', 'ベトナム販社向けのレジ端末操作手順をまとめた資料です。', 'pos-manual-vietnam.pdf', 'application/pdf', 189440, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-20 09:00:00', 'companies', '{}', '{vn-daiso-vietnam}', NULL, NULL, 'upload', 'published', 'seed-document-category-001', 'seed-document-category-001-child-001');
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes", "googleEmbedUrl", "googleUrl", "sourceType", status, "categoryId", "subCategoryId") VALUES ('seed-document-004', '内部監査資料（本部限定）', '日本本部限定の内部監査に関する資料です。', 'internal-audit-hq-only.pdf', 'application/pdf', 1048576, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-15 09:00:00', 'companies', '{}', '{jp-daiso-japan-trading}', NULL, NULL, 'upload', 'published', 'seed-document-category-003', NULL);
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes", "googleEmbedUrl", "googleUrl", "sourceType", status, "categoryId", "subCategoryId") VALUES ('seed-document-005', '什器組み立て手順書（北米向け）', '北米地域向け店舗什器の組み立て手順をまとめた資料です。', 'fixture-assembly-us.pdf', 'application/pdf', 358400, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-10 09:00:00', 'countries', '{US}', '{}', NULL, NULL, 'upload', 'published', 'seed-document-category-002', NULL);


--
-- Data for Name: AnnouncementDocumentLink; Type: TABLE DATA; Schema: public; Owner: portal_mock
--



--
-- Data for Name: AnnouncementNotificationLog; Type: TABLE DATA; Schema: public; Owner: portal_mock
--



--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0kw0000o6uhi5bjntzt', 'Daiso Japan Trading Co.', 'JP', 'jp-daiso-japan-trading', '2026-07-28 03:26:06.32');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0ld0001o6uhzn42x36z', 'Daiso USA Inc.', 'US', 'us-daiso-usa', '2026-07-28 03:26:06.337');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0li0002o6uh3l0ta92z', 'Daiso Korea Co., Ltd.', 'KR', 'kr-daiso-korea', '2026-07-28 03:26:06.342');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0ll0003o6uhgyq8ki6h', 'Daiso Thailand Co., Ltd.', 'TH', 'th-daiso-thailand', '2026-07-28 03:26:06.345');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0lq0004o6uh2qlkvijv', 'Daiso Vietnam Co., Ltd.', 'VN', 'vn-daiso-vietnam', '2026-07-28 03:26:06.35');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0lu0005o6uh14dkdcnj', 'Daiso Indonesia Co., Ltd.', 'ID', 'id-daiso-indonesia', '2026-07-28 03:26:06.355');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0lz0006o6uhkm3nzf5c', 'Daiso Taiwan Co., Ltd.', 'TW', 'tw-daiso-taiwan', '2026-07-28 03:26:06.359');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cms43g0m20007o6uht2kz7nss', 'Daiso Singapore Pte. Ltd.', 'SG', 'sg-daiso-singapore', '2026-07-28 03:26:06.362');


--
-- Data for Name: ApplicantUser; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."ApplicantUser" (id, email, "passwordHash", "displayName", "companyId", "createdAt", "isActive", "preferredLocale") VALUES ('cms43g0m60009o6uhlf838oja', 'applicant@daiso-vietnam.example.com', '$2b$10$FSLUFu5GSH4v2zpzSAa6zemngA10VweAVIGGhR8ORV4s711USHfyi', 'Nguyen Van A', 'cms43g0lq0004o6uh2qlkvijv', '2026-07-28 03:26:06.366', true, 'en');


--
-- Data for Name: AnnouncementReadReceipt; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."AnnouncementReadReceipt" (id, "announcementId", "applicantUserId", "confirmedAt", "readReminderSentAt") VALUES ('cms43g0sc0016o6uhv122i76l', 'seed-announcement-001', 'cms43g0m60009o6uhlf838oja', '2026-07-02 03:00:00', NULL);
INSERT INTO public."AnnouncementReadReceipt" (id, "announcementId", "applicantUserId", "confirmedAt", "readReminderSentAt") VALUES ('cms43g0sj0018o6uhy5wpgxvx', 'seed-announcement-002', 'cms43g0m60009o6uhlf838oja', '2026-07-02 03:00:00', NULL);
INSERT INTO public."AnnouncementReadReceipt" (id, "announcementId", "applicantUserId", "confirmedAt", "readReminderSentAt") VALUES ('cms43g0sn001ao6uh9csc8dtg', 'seed-announcement-003', 'cms43g0m60009o6uhlf838oja', '2026-07-02 03:00:00', NULL);
INSERT INTO public."AnnouncementReadReceipt" (id, "announcementId", "applicantUserId", "confirmedAt", "readReminderSentAt") VALUES ('cms43g0sr001co6uh0472hnax', 'seed-announcement-004', 'cms43g0m60009o6uhlf838oja', '2026-07-02 03:00:00', NULL);
INSERT INTO public."AnnouncementReadReceipt" (id, "announcementId", "applicantUserId", "confirmedAt", "readReminderSentAt") VALUES ('cms43g0sv001eo6uhkeb6b1hc', 'seed-announcement-005', 'cms43g0m60009o6uhlf838oja', '2026-07-02 03:00:00', NULL);


--
-- Data for Name: AnnouncementRecipient; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('jp-daiso-japan-trading-1', 'cms43g0kw0000o6uhi5bjntzt', '高橋 直子');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('jp-daiso-japan-trading-2', 'cms43g0kw0000o6uhi5bjntzt', '佐藤 健');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('us-daiso-usa-1', 'cms43g0ld0001o6uhzn42x36z', 'Robert Johnson');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('us-daiso-usa-2', 'cms43g0ld0001o6uhzn42x36z', 'Emily Davis');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('kr-daiso-korea-1', 'cms43g0li0002o6uh3l0ta92z', 'Kim Min-jun');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('kr-daiso-korea-2', 'cms43g0li0002o6uh3l0ta92z', 'Lee Seo-yeon');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('th-daiso-thailand-1', 'cms43g0ll0003o6uhgyq8ki6h', 'Somchai Srisuk');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('th-daiso-thailand-2', 'cms43g0ll0003o6uhgyq8ki6h', 'Nittaya Boonmee');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('vn-daiso-vietnam-1', 'cms43g0lq0004o6uh2qlkvijv', 'Nguyen Van An');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('vn-daiso-vietnam-2', 'cms43g0lq0004o6uh2qlkvijv', 'Tran Thi Hoa');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('id-daiso-indonesia-1', 'cms43g0lu0005o6uh14dkdcnj', 'Budi Santoso');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('id-daiso-indonesia-2', 'cms43g0lu0005o6uh14dkdcnj', 'Siti Rahayu');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('tw-daiso-taiwan-1', 'cms43g0lz0006o6uhkm3nzf5c', 'Chen Chih-Ming');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('tw-daiso-taiwan-2', 'cms43g0lz0006o6uhkm3nzf5c', 'Lin Mei-Ling');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('sg-daiso-singapore-1', 'cms43g0m20007o6uht2kz7nss', 'Wei Ming Tan');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('sg-daiso-singapore-2', 'cms43g0m20007o6uht2kz7nss', 'Priya Sharma');


--
-- Data for Name: AnnouncementRecipientStatus; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0qn000co6uhhwd35vfs', 'seed-announcement-001', 'jp-daiso-japan-trading-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0qv000eo6uhu5nzpfz1', 'seed-announcement-001', 'us-daiso-usa-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0qz000go6uhyvh8pvc9', 'seed-announcement-001', 'kr-daiso-korea-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0r3000io6uhiwysc1cw', 'seed-announcement-001', 'th-daiso-thailand-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0r7000ko6uhw20zed7f', 'seed-announcement-001', 'jp-daiso-japan-trading-2', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0rb000mo6uh88cun57s', 'seed-announcement-001', 'us-daiso-usa-2', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0rf000oo6uh2nexciry', 'seed-announcement-003', 'jp-daiso-japan-trading-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0rj000qo6uhw3bgkzxv', 'seed-announcement-003', 'us-daiso-usa-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0rm000so6uhxipbsock', 'seed-announcement-003', 'kr-daiso-korea-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0rr000uo6uh2rgi7icf', 'seed-announcement-005', 'jp-daiso-japan-trading-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0ru000wo6uhkbgvh5w1', 'seed-announcement-005', 'us-daiso-usa-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0ry000yo6uhoyy1l1ui', 'seed-announcement-005', 'kr-daiso-korea-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0s10010o6uhq9oc89ia', 'seed-announcement-005', 'th-daiso-thailand-1', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0s50012o6uha30ciifr', 'seed-announcement-005', 'vn-daiso-vietnam-1', NULL, '2026-07-05 00:00:00');
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "completedAt", "reminderSentAt") VALUES ('cms43g0s80014o6uhaamw9xl7', 'seed-announcement-005', 'id-daiso-indonesia-1', NULL, '2026-07-05 00:00:00');


--
-- Data for Name: AnnouncementTranslation; Type: TABLE DATA; Schema: public; Owner: portal_mock
--



--
-- Data for Name: DocumentCategoryTranslation; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."DocumentCategoryTranslation" (id, "categoryId", locale, name) VALUES ('cms43g0t0001fo6uhvres2buv', 'seed-document-category-001', 'en', 'Store Operations Manuals');
INSERT INTO public."DocumentCategoryTranslation" (id, "categoryId", locale, name) VALUES ('cms43g0t9001go6uhkiibfcqm', 'seed-document-category-001-child-001', 'en', 'POS Operations');
INSERT INTO public."DocumentCategoryTranslation" (id, "categoryId", locale, name) VALUES ('cms43g0td001ho6uhcyhu1iu8', 'seed-document-category-002', 'en', 'Merchandising & Fixtures');
INSERT INTO public."DocumentCategoryTranslation" (id, "categoryId", locale, name) VALUES ('cms43g0ti001io6uhqe0x5a2y', 'seed-document-category-003', 'en', 'Internal Audit Materials');


--
-- Data for Name: DocumentTranslation; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."DocumentTranslation" (id, "documentId", locale, title, description) VALUES ('cms43g0tn001jo6uhua6vkj9n', 'seed-document-001', 'en', 'Store Operations Manual (Common Edition)', 'A manual summarizing the basic rules for store operations common to all distributors.');
INSERT INTO public."DocumentTranslation" (id, "documentId", locale, title, description) VALUES ('cms43g0tw001ko6uh8bml9abq', 'seed-document-002', 'en', 'Merchandising Guidelines (Southeast Asia Edition)', 'Guidelines for product display layout for the Southeast Asia region.');
INSERT INTO public."DocumentTranslation" (id, "documentId", locale, title, description) VALUES ('cms43g0u1001lo6uhd6wlo7af', 'seed-document-003', 'en', 'POS Operation Manual (Vietnam Only)', 'A document summarizing the POS terminal operation procedures for the Vietnam distributor.');
INSERT INTO public."DocumentTranslation" (id, "documentId", locale, title, description) VALUES ('cms43g0u9001mo6uhte199ppe', 'seed-document-004', 'en', 'Internal Audit Materials (HQ Only)', 'Materials related to internal audits, limited to Japan headquarters.');
INSERT INTO public."DocumentTranslation" (id, "documentId", locale, title, description) VALUES ('cms43g0ug001no6uhy62orplp', 'seed-document-005', 'en', 'Fixture Assembly Instructions (For North America)', 'A document summarizing the assembly procedure for store fixtures for the North America region.');


--
-- Data for Name: Faq; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-001', 'inquiry_method', '本社への問い合わせはどの方法で行えば良いですか。', 'ポータル上の「問い合わせ申請」ページから、案件種別・緊急度・内容を入力して送信してください。メールや電話での問い合わせは受け付けておりません。', '2026-07-28 03:26:06.671', '2026-07-28 03:26:06.671');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-002', 'inquiry_method', '複数の案件をまとめて1件の問い合わせとして送信できますか。', '1件の問い合わせにつき1つの案件のみご記入ください。複数の案件がある場合は、それぞれ個別に問い合わせを作成してください。', '2026-07-28 03:26:06.679', '2026-07-28 03:26:06.679');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-003', 'inquiry_method', '緊急度の高い問い合わせを行った場合、対応は早くなりますか。', '緊急度は対応の優先順位付けの参考情報として利用しますが、対応順序や対応完了時期を保証するものではありません。緊急性の高い内容は具体的な状況を本文に記載してください。', '2026-07-28 03:26:06.685', '2026-07-28 03:26:06.685');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-004', 'form_input', '問い合わせフォームの「原文言語」は何のために入力しますか。', '「原文言語」は、問い合わせ内容（自由記述）が元々どの言語で書かれているかを示す項目です。本社側での翻訳・確認作業に利用します。', '2026-07-28 03:26:06.69', '2026-07-28 03:26:06.69');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-005', 'form_input', '自由記述欄の文字数に上限はありますか。', '自由記述欄には文字数の上限があります。入力欄の下に表示される残り文字数を確認しながら入力し、上限を超える場合は内容を要約して記載してください。', '2026-07-28 03:26:06.695', '2026-07-28 03:26:06.695');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-006', 'form_input', '会社名や国の情報は毎回入力する必要がありますか。', '現在のフェーズでは問い合わせごとに会社名・国を入力していただく仕様となっています。入力内容に誤りがあると対応が遅れる可能性がありますので、正確にご入力ください。', '2026-07-28 03:26:06.701', '2026-07-28 03:26:06.701');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-007', 'status', '送信した問い合わせの対応状況はどこで確認できますか。', '「申請一覧」ページで、自社が送信した問い合わせの対応状況（新規・対応中・解決済み）を確認できます。', '2026-07-28 03:26:06.706', '2026-07-28 03:26:06.706');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-008', 'status', '「対応中」から「解決済み」に変わるまでの目安期間はどれくらいですか。', '案件の内容や混雑状況により対応期間は異なるため、一律の目安期間は設けておりません。進捗が気になる場合は、申請一覧の詳細画面をご確認ください。', '2026-07-28 03:26:06.711', '2026-07-28 03:26:06.711');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-009', 'status', '解決済みになった問い合わせについて、追加で質問したい場合はどうすれば良いですか。', '解決済みの問い合わせに対する追記機能は現在提供しておりません。追加で確認したい内容がある場合は、新規の問い合わせとして改めて送信してください。', '2026-07-28 03:26:06.715', '2026-07-28 03:26:06.715');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-010', 'other', 'ポータルの表示言語はどこで切り替えられますか。', '画面上部のヘッダーにある言語切り替えメニューから、日本語・英語の表示を切り替えることができます。', '2026-07-28 03:26:06.719', '2026-07-28 03:26:06.719');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-011', 'other', 'ポータルにログインできない場合はどうすれば良いですか。', 'ログインに関するトラブルは、社内の情報システム管理者または導入時にご案内した連絡先にお問い合わせください。本ポータルの問い合わせフォームでは対応できません。', '2026-07-28 03:26:06.724', '2026-07-28 03:26:06.724');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt", "updatedAt") VALUES ('seed-faq-012', 'other', 'リンク集やお知らせの内容はどのくらいの頻度で更新されますか。', 'リンク集やお知らせは、本社側で随時更新しています。更新頻度は内容によって異なり、一定のスケジュールは定めていません。', '2026-07-28 03:26:06.728', '2026-07-28 03:26:06.728');


--
-- Data for Name: FaqTranslation; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0um001oo6uhipgo4vn4', 'seed-faq-001', 'en', 'How should I contact the head office?', 'Please submit your inquiry from the "Inquiry" page on the portal, entering the case type, urgency, and details. Inquiries by email or phone are not accepted.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0uv001po6uhwdof55tn', 'seed-faq-002', 'en', 'Can I submit multiple cases in a single inquiry?', 'Please include only one case per inquiry. If you have multiple cases, create a separate inquiry for each one.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0v0001qo6uhoopc1665', 'seed-faq-003', 'en', 'Will a high-urgency inquiry be handled faster?', 'Urgency is used as a reference for prioritizing responses, but it does not guarantee the order or timing of resolution. For urgent matters, please describe the specific situation in the inquiry text.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0v6001ro6uhpbm50r6k', 'seed-faq-004', 'en', 'What is the "original language" field on the inquiry form for?', 'The "original language" field indicates the language in which the free-text inquiry content was originally written. It is used by the head office for translation and review.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0vb001so6uhj7714rq5', 'seed-faq-005', 'en', 'Is there a character limit for the free-text field?', 'Yes, the free-text field has a character limit. Check the remaining character count shown below the field as you type, and summarize your content if it exceeds the limit.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0vh001to6uhyf8m83kq', 'seed-faq-006', 'en', 'Do I need to enter the company name and country every time?', 'In the current phase, the company name and country must be entered for each inquiry. Incorrect input may delay the response, so please enter this information accurately.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0vm001uo6uhflv0xjve', 'seed-faq-007', 'en', 'Where can I check the status of an inquiry I submitted?', 'You can check the status of inquiries submitted by your company (New, In Progress, Resolved) on the "Inquiry List" page.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0vr001vo6uhvrms8noc', 'seed-faq-008', 'en', 'How long does it typically take for a case to move from "In Progress" to "Resolved"?', 'The response time varies depending on the content of the case and current workload, so no uniform estimate is provided. If you are concerned about progress, please check the detail screen on the inquiry list.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0vv001wo6uhb3t3wudt', 'seed-faq-009', 'en', 'What should I do if I have an additional question about an inquiry that is already resolved?', 'There is currently no feature to add a follow-up to a resolved inquiry. If you have additional questions, please submit a new inquiry.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0vz001xo6uhykcw6ppm', 'seed-faq-010', 'en', 'Where can I switch the display language of the portal?', 'You can switch between Japanese and English using the language switcher menu in the header at the top of the screen.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0w4001yo6uhadzjmz7r', 'seed-faq-011', 'en', 'What should I do if I cannot log in to the portal?', 'For login issues, please contact your company''s IT administrator or the contact provided during setup. This cannot be handled through the portal''s inquiry form.');
INSERT INTO public."FaqTranslation" (id, "faqId", locale, question, answer) VALUES ('cms43g0w8001zo6uht1uzbpxp', 'seed-faq-012', 'en', 'How often is the content of the links list or announcements updated?', 'Links and announcements are updated by the head office as needed. The update frequency varies by content, and no fixed schedule is set.');


--
-- Data for Name: HelpdeskStaff; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."HelpdeskStaff" (id, email, "passwordHash", "displayName", "createdAt") VALUES ('cms43g0me000ao6uh7tz4f7g0', 'staff@helpdesk.example.com', '$2b$10$FSLUFu5GSH4v2zpzSAa6zemngA10VweAVIGGhR8ORV4s711USHfyi', '田中 太郎', '2026-07-28 03:26:06.375');


--
-- Data for Name: Inquiry; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('seed-inquiry-001', 'defect', 'high', 'Ho Chi Minh City', '納品された商品に破損が見られます。至急対応をお願いします。', 'ja', NULL, 'new', '2026-07-28 03:26:06.381', 'cms43g0lq0004o6uh2qlkvijv', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL, '納品商品の破損について（至急）', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-001', 'defect', 'high', 'Kanto', '店舗に納品された商品の一部に破損が見られます。至急対応をお願いします。', 'ja', NULL, 'new', '2026-06-28 18:15:00', 'cms43g0kw0000o6uhi5bjntzt', 'Daiso Japan Trading Co.', 'JP', NULL, NULL, '納品商品の一部破損について', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-002', 'order', 'medium', 'West Coast', 'We would like to place an additional order for next month''s shipment.', 'en', '来月分の配送に向けて追加発注をお願いしたいです。', 'in_progress', '2026-06-25 23:30:00', 'cms43g0ld0001o6uhzn42x36z', 'Daiso USA Inc.', 'US', NULL, NULL, 'Additional order request for next shipment', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-003', 'system', 'high', 'Seoul', '포털 시스템에 로그인할 수 없는 문제가 발생하고 있습니다.', 'ko', 'ポータルシステムにログインできない問題が発生しています。', 'new', '2026-06-29 11:45:00', 'cms43g0li0002o6uh3l0ta92z', 'Daiso Korea Co., Ltd.', 'KR', NULL, NULL, '포털 시스템 로그인 불가 문제', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-004', 'other', 'low', 'Bangkok', '次回の販促キャンペーンに関する資料の共有をお願いしたいです。', 'ja', NULL, 'resolved', '2026-06-10 15:00:00', 'cms43g0ll0003o6uhgyq8ki6h', 'Daiso Thailand Co., Ltd.', 'TH', NULL, NULL, '販促キャンペーン資料の共有依頼', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-005', 'defect', 'medium', 'Taipei', '部分商品外包裝有輕微破損，請確認是否需要更換。', 'zh', '一部商品の外装に軽微な破損が見られます。交換の必要があるかご確認ください。', 'in_progress', '2026-06-20 20:20:00', 'cms43g0lz0006o6uhkm3nzf5c', 'Daiso Taiwan Co., Ltd.', 'TW', NULL, NULL, '部分商品外包裝輕微破損', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-006', 'order', 'low', 'Singapore', 'Could you confirm the estimated delivery date for order #4821?', 'en', '注文番号#4821の配送予定日をご確認いただけますでしょうか。', 'resolved', '2026-05-30 17:10:00', 'cms43g0m20007o6uht2kz7nss', 'Daiso Singapore Pte. Ltd.', 'SG', NULL, NULL, 'Delivery date confirmation for order #4821', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-007', 'system', 'low', 'Ho Chi Minh City', 'Trang cổng thông tin hiển thị chậm khi tải danh sách đơn hàng.', 'vi', 'ポータルサイトで注文一覧を読み込む際の表示が遅くなっています。', 'new', '2026-06-27 22:05:00', 'cms43g0lq0004o6uh2qlkvijv', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL, 'Cổng thông tin tải chậm khi xem đơn hàng', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-008', 'other', 'medium', 'Jakarta', 'Kami ingin menanyakan mengenai perpanjangan kontrak distribusi.', 'id', '販売契約の更新についてお伺いしたいです。', 'in_progress', '2026-06-15 14:40:00', 'cms43g0lu0005o6uh14dkdcnj', 'Daiso Indonesia Co., Ltd.', 'ID', NULL, NULL, 'Pertanyaan perpanjangan kontrak distribusi', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-009', 'order', 'medium', 'Da Nang', 'Chúng tôi muốn đặt thêm hàng cho đợt giao tháng sau.', 'vi', '来月分の配送に向けて追加発注をお願いしたいです。', 'in_progress', '2026-06-22 18:30:00', 'cms43g0lq0004o6uh2qlkvijv', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL, 'Đặt thêm hàng cho đợt giao tháng sau', NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt", title, "lastReadAt") VALUES ('inquiry-010', 'defect', 'high', 'Hanoi', 'Sản phẩm giao đến bị lỗi, đã được đổi trả và xử lý xong.', 'vi', '納品された商品に不具合があり、交換・対応は既に完了しております。', 'resolved', '2026-06-05 11:15:00', 'cms43g0lq0004o6uh2qlkvijv', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL, 'Sản phẩm lỗi đã đổi trả - đã xử lý xong', NULL);


--
-- Data for Name: InquiryHistoryEntry; Type: TABLE DATA; Schema: public; Owner: portal_mock
--



--
-- Data for Name: InquiryAttachment; Type: TABLE DATA; Schema: public; Owner: portal_mock
--



--
-- Data for Name: Link; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-001', '社内ポータル（グループウェア）', 'https://example.com/internal/groupware', 'internal', 'スケジュール管理・社内連絡に使用する社内ポータルです。', '2026-07-28 03:26:06.732');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-002', '販売管理システム', 'https://example.com/internal/sales-system', 'internal', '受発注状況・在庫状況を確認できる販売管理システムです。', '2026-07-28 03:26:06.738');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-003', '勤怠管理システム', 'https://example.com/internal/attendance', 'internal', NULL, '2026-07-28 03:26:06.742');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-004', 'Daiso公式サイト', 'https://example.com/external/daiso-official', 'external', '商品情報・店舗情報を掲載する公式サイトです。', '2026-07-28 03:26:06.746');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-005', '取引先向けサプライヤーポータル', 'https://example.com/external/supplier-portal', 'external', '取引先企業との連携に利用する外部ポータルです。', '2026-07-28 03:26:06.75');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-006', '為替レート情報サイト', 'https://example.com/external/exchange-rate', 'external', NULL, '2026-07-28 03:26:06.753');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-007', '販社担当者向け業務マニュアル', 'https://example.com/document/operation-manual.pdf', 'document', '日常業務の手順をまとめたマニュアルです。', '2026-07-28 03:26:06.757');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-008', '問い合わせ対応フローチャート', 'https://example.com/document/inquiry-flowchart.pdf', 'document', '問い合わせ受付から解決までの対応フローです。', '2026-07-28 03:26:06.76');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-009', 'よくある質問集（FAQ）', 'https://example.com/document/faq.pdf', 'document', NULL, '2026-07-28 03:26:06.763');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-010', '本社連絡先一覧', 'https://example.com/other/contact-list', 'other', '各拠点の本社窓口の連絡先一覧です。', '2026-07-28 03:26:06.766');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-011', 'システム利用規約', 'https://example.com/other/terms-of-use', 'other', NULL, '2026-07-28 03:26:06.77');


--
-- Data for Name: ReplyTemplate; Type: TABLE DATA; Schema: public; Owner: portal_mock
--

INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-001', 'defect', '不良品対応（交換・返金案内）', 'この度はご不便をおかけし申し訳ございません。不良品の詳細を確認のうえ、交換または返金の対応についてご案内いたします。', '2026-07-28 03:26:06.774');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-002', 'defect', '不良品対応（詳細確認依頼）', 'お問い合わせいただいた不良の状況について、恐れ入りますが写真または詳細な症状をご共有いただけますでしょうか。確認のうえ改めてご案内いたします。', '2026-07-28 03:26:06.781');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-003', 'order', '発注内容確認（発送日未定）', 'お問い合わせいただいた発注内容について確認いたしました。発送予定日が確定次第、改めてご連絡いたします。', '2026-07-28 03:26:06.785');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-004', 'order', '発注内容確認（発送日確定案内）', 'ご注文いただいた商品の発送日が確定いたしましたのでご案内いたします。発送後、追跡番号を別途ご連絡いたします。', '2026-07-28 03:26:06.789');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-005', 'system', 'システム不具合（受付・調査中）', 'システムの不具合について報告いただきありがとうございます。現在状況を確認しておりますので、今しばらくお待ちください。', '2026-07-28 03:26:06.793');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-006', 'system', 'システム不具合（対応完了報告）', 'ご報告いただいたシステムの不具合について、修正対応が完了いたしましたのでご報告いたします。ご不便をおかけし申し訳ございませんでした。', '2026-07-28 03:26:06.796');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-007', 'other', 'その他問い合わせ（受付案内）', 'お問い合わせいただきありがとうございます。内容を確認のうえ、担当部署より改めてご連絡いたします。', '2026-07-28 03:26:06.799');


--
-- PostgreSQL database dump complete
--


