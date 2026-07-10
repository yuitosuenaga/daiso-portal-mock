--
-- prisma/seed.ts と同内容のデモデータ（会社8社・申請者/ヘルプデスクアカウント各1・
-- 問い合わせ1件・お知らせ5件+担当者16名+確認状況47件・ドキュメント5件・FAQ12件・
-- リンク11件・返信テンプレート7件）をDBeaver等のSQLエディタから直接投入するための
-- データのみのSQLファイル（pg_dump --data-only --inserts で生成）。
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
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public."Announcement" DISABLE TRIGGER ALL;

INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries") VALUES ('seed-announcement-001', 'システムメンテナンスのお知らせ（7月15日 2:00〜4:00）', '2026年7月15日 2:00〜4:00の間、システムメンテナンスを実施いたします。メンテナンス中はポータルサイトにアクセスできませんのでご注意ください。ご不便をおかけしますが、何卒ご理解のほどよろしくお願いいたします。', 'maintenance', '2026-07-01 09:00:00', true, 'all', '{}');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries") VALUES ('seed-announcement-002', '新しいFAQページを追加しました', 'よくあるお問い合わせをまとめたFAQページを新設しました。お問い合わせの前にぜひご活用ください。今後も内容を随時更新してまいります。', 'other', '2026-06-28 09:00:00', false, 'all', '{}');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries") VALUES ('seed-announcement-003', '問い合わせフォームの項目を更新しました', '問い合わせ・申請フォームの入力項目を一部更新しました。案件種別・緊急度の選択肢が変更されておりますので、ご利用の際はご確認ください。', 'policy', '2026-06-20 09:00:00', true, 'all', '{}');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries") VALUES ('seed-announcement-004', '夏季休業期間のお知らせ（8月13日〜16日）', '誠に恐れ入りますが、8月13日〜16日は夏季休業期間とさせていただきます。休業期間中に受け付けた問い合わせは、休業明けに順次対応いたします。', 'other', '2026-06-15 09:00:00', false, 'all', '{}');
INSERT INTO public."Announcement" (id, title, body, category, "publishedAt", "actionRequired", "targetingScope", "targetingCountries") VALUES ('seed-announcement-005', '決済システム障害の発生について', '本日未明、決済システムに障害が発生し、一部の処理が正常に完了しない事象が確認されました。現在は復旧しておりますが、影響を受けた処理については別途ご案内いたします。', 'incident', '2026-06-10 09:00:00', true, 'all', '{}');


ALTER TABLE public."Announcement" ENABLE TRIGGER ALL;

--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."Company" DISABLE TRIGGER ALL;

INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6tg20000o6qz67w623w1', 'Daiso Japan Trading Co.', 'JP', 'jp-daiso-japan-trading', '2026-07-10 02:48:53.136');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6tgh0001o6qzc1o63ecy', 'Daiso USA Inc.', 'US', 'us-daiso-usa', '2026-07-10 02:48:53.153');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6tgk0002o6qzrwrr0awa', 'Daiso Korea Co., Ltd.', 'KR', 'kr-daiso-korea', '2026-07-10 02:48:53.157');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6tgo0003o6qzo9ag1n3h', 'Daiso Thailand Co., Ltd.', 'TH', 'th-daiso-thailand', '2026-07-10 02:48:53.16');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6tgr0004o6qzycmcy5d9', 'Daiso Vietnam Co., Ltd.', 'VN', 'vn-daiso-vietnam', '2026-07-10 02:48:53.164');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6tgu0005o6qzvusvgjx0', 'Daiso Indonesia Co., Ltd.', 'ID', 'id-daiso-indonesia', '2026-07-10 02:48:53.167');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6tgy0006o6qzg994csnr', 'Daiso Taiwan Co., Ltd.', 'TW', 'tw-daiso-taiwan', '2026-07-10 02:48:53.171');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmrec6th10007o6qzmbnmalqt', 'Daiso Singapore Pte. Ltd.', 'SG', 'sg-daiso-singapore', '2026-07-10 02:48:53.174');


ALTER TABLE public."Company" ENABLE TRIGGER ALL;

--
-- Data for Name: AnnouncementRecipient; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."AnnouncementRecipient" DISABLE TRIGGER ALL;

INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('jp-daiso-japan-trading-1', 'cmrec6tg20000o6qz67w623w1', '高橋 直子');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('jp-daiso-japan-trading-2', 'cmrec6tg20000o6qz67w623w1', '佐藤 健');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('us-daiso-usa-1', 'cmrec6tgh0001o6qzc1o63ecy', 'Robert Johnson');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('us-daiso-usa-2', 'cmrec6tgh0001o6qzc1o63ecy', 'Emily Davis');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('kr-daiso-korea-1', 'cmrec6tgk0002o6qzrwrr0awa', 'Kim Min-jun');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('kr-daiso-korea-2', 'cmrec6tgk0002o6qzrwrr0awa', 'Lee Seo-yeon');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('th-daiso-thailand-1', 'cmrec6tgo0003o6qzo9ag1n3h', 'Somchai Srisuk');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('th-daiso-thailand-2', 'cmrec6tgo0003o6qzo9ag1n3h', 'Nittaya Boonmee');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('vn-daiso-vietnam-1', 'cmrec6tgr0004o6qzycmcy5d9', 'Nguyen Van An');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('vn-daiso-vietnam-2', 'cmrec6tgr0004o6qzycmcy5d9', 'Tran Thi Hoa');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('id-daiso-indonesia-1', 'cmrec6tgu0005o6qzvusvgjx0', 'Budi Santoso');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('id-daiso-indonesia-2', 'cmrec6tgu0005o6qzvusvgjx0', 'Siti Rahayu');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('tw-daiso-taiwan-1', 'cmrec6tgy0006o6qzg994csnr', 'Chen Chih-Ming');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('tw-daiso-taiwan-2', 'cmrec6tgy0006o6qzg994csnr', 'Lin Mei-Ling');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('sg-daiso-singapore-1', 'cmrec6th10007o6qzmbnmalqt', 'Wei Ming Tan');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('sg-daiso-singapore-2', 'cmrec6th10007o6qzmbnmalqt', 'Priya Sharma');


ALTER TABLE public."AnnouncementRecipient" ENABLE TRIGGER ALL;

--
-- Data for Name: AnnouncementRecipientStatus; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."AnnouncementRecipientStatus" DISABLE TRIGGER ALL;

INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tk3000co6qzkuvofnn7', 'seed-announcement-001', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tk9000eo6qzyb83w6gr', 'seed-announcement-001', 'us-daiso-usa-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkd000go6qzh08rh0t2', 'seed-announcement-001', 'kr-daiso-korea-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkh000io6qznbj5m3yd', 'seed-announcement-001', 'th-daiso-thailand-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkl000ko6qz9ml7eqe2', 'seed-announcement-001', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkn000mo6qz0k0hx7fr', 'seed-announcement-001', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkq000oo6qza9ygmxcc', 'seed-announcement-001', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkt000qo6qzd4cghyam', 'seed-announcement-001', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkw000so6qzw133gnzs', 'seed-announcement-001', 'jp-daiso-japan-trading-2', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tkz000uo6qzao8v5x1s', 'seed-announcement-001', 'us-daiso-usa-2', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tl2000wo6qzu114uonc', 'seed-announcement-002', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tl5000yo6qz3c1ny8u6', 'seed-announcement-002', 'jp-daiso-japan-trading-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tl80010o6qzo6qel9ui', 'seed-announcement-002', 'us-daiso-usa-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tlb0012o6qzb76426rp', 'seed-announcement-002', 'us-daiso-usa-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tld0014o6qz0y0asar6', 'seed-announcement-002', 'kr-daiso-korea-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tlg0016o6qzimq18jx9', 'seed-announcement-002', 'th-daiso-thailand-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tlk0018o6qz2ebo7jir', 'seed-announcement-002', 'th-daiso-thailand-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tln001ao6qzkxh1kvah', 'seed-announcement-002', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tlq001co6qzlr16an73', 'seed-announcement-002', 'vn-daiso-vietnam-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tlu001eo6qz4tphvke7', 'seed-announcement-002', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tlx001go6qzl26mirb2', 'seed-announcement-002', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tm0001io6qzp99538lq', 'seed-announcement-002', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tm3001ko6qzwjoitugk', 'seed-announcement-003', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tm8001mo6qzbq5udgbd', 'seed-announcement-003', 'us-daiso-usa-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tmc001oo6qzmjoh92k7', 'seed-announcement-003', 'kr-daiso-korea-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tmf001qo6qz7cqrw727', 'seed-announcement-003', 'th-daiso-thailand-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tmj001so6qz48yx2wz5', 'seed-announcement-003', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tmn001uo6qz0ul88sep', 'seed-announcement-003', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tmr001wo6qznbxt42md', 'seed-announcement-003', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tmv001yo6qzt5k0n4gn', 'seed-announcement-003', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tmz0020o6qzgx4dciz3', 'seed-announcement-004', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tn30022o6qzxe2ms9kf', 'seed-announcement-004', 'us-daiso-usa-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tn70024o6qzz2n7dawu', 'seed-announcement-004', 'kr-daiso-korea-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tnb0026o6qzgluue87a', 'seed-announcement-004', 'th-daiso-thailand-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tng0028o6qz2h56ftyh', 'seed-announcement-004', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tnl002ao6qzhd5wzkiu', 'seed-announcement-004', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tno002co6qz0yuqi1e1', 'seed-announcement-004', 'id-daiso-indonesia-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tnt002eo6qz21heown0', 'seed-announcement-004', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tnx002go6qzcr34jnop', 'seed-announcement-004', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6to2002io6qzogels835', 'seed-announcement-005', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6to5002ko6qzghxiaedv', 'seed-announcement-005', 'us-daiso-usa-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6to9002mo6qz6o15bftv', 'seed-announcement-005', 'kr-daiso-korea-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tod002oo6qzngo7dc38', 'seed-announcement-005', 'th-daiso-thailand-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6toh002qo6qzkph4krtx', 'seed-announcement-005', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, '2026-07-05 00:00:00');
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tok002so6qzj1bjmp66', 'seed-announcement-005', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, '2026-07-05 00:00:00');
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6ton002uo6qzkjdc5atp', 'seed-announcement-005', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmrec6tor002wo6qzpq32g1sh', 'seed-announcement-005', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);


ALTER TABLE public."AnnouncementRecipientStatus" ENABLE TRIGGER ALL;

--
-- Data for Name: ApplicantUser; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."ApplicantUser" DISABLE TRIGGER ALL;

INSERT INTO public."ApplicantUser" (id, email, "passwordHash", "displayName", "companyId", "createdAt") VALUES ('cmrec6th70009o6qzjy7cfc7m', 'applicant@daiso-vietnam.example.com', '$2b$10$0n6pzCW4mSl3018XUhVEn.zrDTA6HgAUv7s4qmX8OiFMIcsYfO2nW', 'Nguyen Van A', 'cmrec6tgr0004o6qzycmcy5d9', '2026-07-10 02:48:53.179');


ALTER TABLE public."ApplicantUser" ENABLE TRIGGER ALL;

--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."Document" DISABLE TRIGGER ALL;

INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes") VALUES ('seed-document-001', '店舗運営マニュアル（共通版）', '全販社共通の店舗運営における基本ルールをまとめたマニュアルです。', 'store-operations-manual.pdf', 'application/pdf', 245760, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-07-01 09:00:00', 'all', '{}', '{}');
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes") VALUES ('seed-document-002', '商品陳列ガイドライン（東南アジア版）', '東南アジア地域向けの商品陳列レイアウトのガイドラインです。', 'merchandising-guideline-sea.pdf', 'application/pdf', 512000, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-25 09:00:00', 'countries', '{VN,TH,ID}', '{}');
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes") VALUES ('seed-document-003', 'レジ操作マニュアル（ベトナム限定）', 'ベトナム販社向けのレジ端末操作手順をまとめた資料です。', 'pos-manual-vietnam.pdf', 'application/pdf', 189440, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-20 09:00:00', 'companies', '{}', '{vn-daiso-vietnam}');
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes") VALUES ('seed-document-004', '内部監査資料（本部限定）', '日本本部限定の内部監査に関する資料です。', 'internal-audit-hq-only.pdf', 'application/pdf', 1048576, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-15 09:00:00', 'companies', '{}', '{jp-daiso-japan-trading}');
INSERT INTO public."Document" (id, title, description, "fileName", "fileType", "fileSize", "dataUrl", "uploadedAt", "targetingScope", "targetingCountries", "targetingCompanyCodes") VALUES ('seed-document-005', '什器組み立て手順書（北米向け）', '北米地域向け店舗什器の組み立て手順をまとめた資料です。', 'fixture-assembly-us.pdf', 'application/pdf', 358400, 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNjIgPj4Kc3RyZWFtCkJUIC9GMSAxOCBUZiAyMCAxMDAgVGQgKFNhbXBsZSBEb2N1bWVudCBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjAKJSVFT0YK', '2026-06-10 09:00:00', 'countries', '{US}', '{}');


ALTER TABLE public."Document" ENABLE TRIGGER ALL;

--
-- Data for Name: Faq; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."Faq" DISABLE TRIGGER ALL;

INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-001', 'inquiry_method', 'ヘルプデスクへの問い合わせはどの方法で行えば良いですか。', 'ポータル上の「問い合わせ申請」ページから、案件種別・緊急度・内容を入力して送信してください。メールや電話での問い合わせは受け付けておりません。', '2026-07-10 02:48:53.476');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-002', 'inquiry_method', '複数の案件をまとめて1件の問い合わせとして送信できますか。', '1件の問い合わせにつき1つの案件のみご記入ください。複数の案件がある場合は、それぞれ個別に問い合わせを作成してください。', '2026-07-10 02:48:53.481');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-003', 'inquiry_method', '緊急度の高い問い合わせを行った場合、対応は早くなりますか。', '緊急度は対応の優先順位付けの参考情報として利用しますが、対応順序や対応完了時期を保証するものではありません。緊急性の高い内容は具体的な状況を本文に記載してください。', '2026-07-10 02:48:53.483');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-004', 'form_input', '問い合わせフォームの「原文言語」は何のために入力しますか。', '「原文言語」は、問い合わせ内容（自由記述）が元々どの言語で書かれているかを示す項目です。ヘルプデスク側での翻訳・確認作業に利用します。', '2026-07-10 02:48:53.486');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-005', 'form_input', '自由記述欄の文字数に上限はありますか。', '自由記述欄には文字数の上限があります。入力欄の下に表示される残り文字数を確認しながら入力し、上限を超える場合は内容を要約して記載してください。', '2026-07-10 02:48:53.49');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-006', 'form_input', '会社名や国の情報は毎回入力する必要がありますか。', '現在のフェーズでは問い合わせごとに会社名・国を入力していただく仕様となっています。入力内容に誤りがあると対応が遅れる可能性がありますので、正確にご入力ください。', '2026-07-10 02:48:53.493');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-007', 'status', '送信した問い合わせの対応状況はどこで確認できますか。', '「問い合わせ一覧」ページで、自社が送信した問い合わせの対応状況（新規・対応中・解決済み）を確認できます。', '2026-07-10 02:48:53.497');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-008', 'status', '「対応中」から「解決済み」に変わるまでの目安期間はどれくらいですか。', '案件の内容や混雑状況により対応期間は異なるため、一律の目安期間は設けておりません。進捗が気になる場合は、問い合わせ一覧の詳細画面をご確認ください。', '2026-07-10 02:48:53.501');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-009', 'status', '解決済みになった問い合わせについて、追加で質問したい場合はどうすれば良いですか。', '解決済みの問い合わせに対する追記機能は現在提供しておりません。追加で確認したい内容がある場合は、新規の問い合わせとして改めて送信してください。', '2026-07-10 02:48:53.504');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-010', 'other', 'ポータルの表示言語はどこで切り替えられますか。', '画面上部のヘッダーにある言語切り替えメニューから、日本語・英語の表示を切り替えることができます。', '2026-07-10 02:48:53.507');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-011', 'other', 'ポータルにログインできない場合はどうすれば良いですか。', 'ログインに関するトラブルは、社内の情報システム管理者または導入時にご案内した連絡先にお問い合わせください。本ポータルの問い合わせフォームでは対応できません。', '2026-07-10 02:48:53.511');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-012', 'other', 'リンク集やお知らせの内容はどのくらいの頻度で更新されますか。', 'リンク集やお知らせは、ヘルプデスク側で随時更新しています。更新頻度は内容によって異なり、一定のスケジュールは定めていません。', '2026-07-10 02:48:53.514');


ALTER TABLE public."Faq" ENABLE TRIGGER ALL;

--
-- Data for Name: HelpdeskStaff; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."HelpdeskStaff" DISABLE TRIGGER ALL;

INSERT INTO public."HelpdeskStaff" (id, email, "passwordHash", "displayName", "createdAt") VALUES ('cmrec6thh000ao6qzq1g2dspf', 'staff@helpdesk.example.com', '$2b$10$0n6pzCW4mSl3018XUhVEn.zrDTA6HgAUv7s4qmX8OiFMIcsYfO2nW', '田中 太郎', '2026-07-10 02:48:53.189');


ALTER TABLE public."HelpdeskStaff" ENABLE TRIGGER ALL;

--
-- Data for Name: Inquiry; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."Inquiry" DISABLE TRIGGER ALL;

INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('seed-inquiry-001', 'defect', 'high', 'Ho Chi Minh City', '納品された商品に破損が見られます。至急対応をお願いします。', 'ja', NULL, 'new', '2026-07-10 02:48:53.196', 'cmrec6tgr0004o6qzycmcy5d9', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL);


ALTER TABLE public."Inquiry" ENABLE TRIGGER ALL;

--
-- Data for Name: InquiryHistoryEntry; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."InquiryHistoryEntry" DISABLE TRIGGER ALL;



ALTER TABLE public."InquiryHistoryEntry" ENABLE TRIGGER ALL;

--
-- Data for Name: InquiryAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."InquiryAttachment" DISABLE TRIGGER ALL;



ALTER TABLE public."InquiryAttachment" ENABLE TRIGGER ALL;

--
-- Data for Name: Link; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."Link" DISABLE TRIGGER ALL;

INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-001', '社内ポータル（グループウェア）', 'https://example.com/internal/groupware', 'internal', 'スケジュール管理・社内連絡に使用する社内ポータルです。', '2026-07-10 02:48:53.517');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-002', '販売管理システム', 'https://example.com/internal/sales-system', 'internal', '受発注状況・在庫状況を確認できる販売管理システムです。', '2026-07-10 02:48:53.524');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-003', '勤怠管理システム', 'https://example.com/internal/attendance', 'internal', NULL, '2026-07-10 02:48:53.528');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-004', 'Daiso公式サイト', 'https://example.com/external/daiso-official', 'external', '商品情報・店舗情報を掲載する公式サイトです。', '2026-07-10 02:48:53.532');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-005', '取引先向けサプライヤーポータル', 'https://example.com/external/supplier-portal', 'external', '取引先企業との連携に利用する外部ポータルです。', '2026-07-10 02:48:53.536');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-006', '為替レート情報サイト', 'https://example.com/external/exchange-rate', 'external', NULL, '2026-07-10 02:48:53.541');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-007', '販社担当者向け業務マニュアル', 'https://example.com/document/operation-manual.pdf', 'document', '日常業務の手順をまとめたマニュアルです。', '2026-07-10 02:48:53.545');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-008', '問い合わせ対応フローチャート', 'https://example.com/document/inquiry-flowchart.pdf', 'document', '問い合わせ受付から解決までの対応フローです。', '2026-07-10 02:48:53.549');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-009', 'よくある質問集（FAQ）', 'https://example.com/document/faq.pdf', 'document', NULL, '2026-07-10 02:48:53.552');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-010', 'ヘルプデスク連絡先一覧', 'https://example.com/other/contact-list', 'other', '各拠点のヘルプデスク窓口の連絡先一覧です。', '2026-07-10 02:48:53.555');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-011', 'システム利用規約', 'https://example.com/other/terms-of-use', 'other', NULL, '2026-07-10 02:48:53.559');


ALTER TABLE public."Link" ENABLE TRIGGER ALL;

--
-- Data for Name: ReplyTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."ReplyTemplate" DISABLE TRIGGER ALL;

INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-001', 'defect', '不良品対応（交換・返金案内）', 'この度はご不便をおかけし申し訳ございません。不良品の詳細を確認のうえ、交換または返金の対応についてご案内いたします。', '2026-07-10 02:48:53.563');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-002', 'defect', '不良品対応（詳細確認依頼）', 'お問い合わせいただいた不良の状況について、恐れ入りますが写真または詳細な症状をご共有いただけますでしょうか。確認のうえ改めてご案内いたします。', '2026-07-10 02:48:53.569');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-003', 'order', '発注内容確認（発送日未定）', 'お問い合わせいただいた発注内容について確認いたしました。発送予定日が確定次第、改めてご連絡いたします。', '2026-07-10 02:48:53.574');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-004', 'order', '発注内容確認（発送日確定案内）', 'ご注文いただいた商品の発送日が確定いたしましたのでご案内いたします。発送後、追跡番号を別途ご連絡いたします。', '2026-07-10 02:48:53.577');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-005', 'system', 'システム不具合（受付・調査中）', 'システムの不具合について報告いただきありがとうございます。現在状況を確認しておりますので、今しばらくお待ちください。', '2026-07-10 02:48:53.581');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-006', 'system', 'システム不具合（対応完了報告）', 'ご報告いただいたシステムの不具合について、修正対応が完了いたしましたのでご報告いたします。ご不便をおかけし申し訳ございませんでした。', '2026-07-10 02:48:53.584');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-007', 'other', 'その他問い合わせ（受付案内）', 'お問い合わせいただきありがとうございます。内容を確認のうえ、担当部署より改めてご連絡いたします。', '2026-07-10 02:48:53.587');


ALTER TABLE public."ReplyTemplate" ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--


