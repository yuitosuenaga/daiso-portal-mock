--
-- prisma/seed.ts と同内容のデモデータ（会社8社・申請者/ヘルプデスクアカウント各1・
-- 問い合わせ11件（seed-inquiry-001 + inquiry-001〜010の多様なサンプル）・
-- お知らせ5件+担当者16名+確認状況47件・ドキュメント5件・FAQ12件・
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

INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6as0000o60sk8eqyjk4', 'Daiso Japan Trading Co.', 'JP', 'jp-daiso-japan-trading', '2026-07-10 03:27:15.94');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6bd0001o60s0wo76qxr', 'Daiso USA Inc.', 'US', 'us-daiso-usa', '2026-07-10 03:27:15.962');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6bj0002o60st0gz3qju', 'Daiso Korea Co., Ltd.', 'KR', 'kr-daiso-korea', '2026-07-10 03:27:15.968');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6bo0003o60s9i6jj6pj', 'Daiso Thailand Co., Ltd.', 'TH', 'th-daiso-thailand', '2026-07-10 03:27:15.973');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6bt0004o60sbqoff9sc', 'Daiso Vietnam Co., Ltd.', 'VN', 'vn-daiso-vietnam', '2026-07-10 03:27:15.977');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6bx0005o60s22dgq3xw', 'Daiso Indonesia Co., Ltd.', 'ID', 'id-daiso-indonesia', '2026-07-10 03:27:15.982');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6c20006o60s8d5hj108', 'Daiso Taiwan Co., Ltd.', 'TW', 'tw-daiso-taiwan', '2026-07-10 03:27:15.987');
INSERT INTO public."Company" (id, name, country, "companyCode", "createdAt") VALUES ('cmredk6c60007o60sscvsnegq', 'Daiso Singapore Pte. Ltd.', 'SG', 'sg-daiso-singapore', '2026-07-10 03:27:15.991');


ALTER TABLE public."Company" ENABLE TRIGGER ALL;

--
-- Data for Name: AnnouncementRecipient; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."AnnouncementRecipient" DISABLE TRIGGER ALL;

INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('jp-daiso-japan-trading-1', 'cmredk6as0000o60sk8eqyjk4', '高橋 直子');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('jp-daiso-japan-trading-2', 'cmredk6as0000o60sk8eqyjk4', '佐藤 健');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('us-daiso-usa-1', 'cmredk6bd0001o60s0wo76qxr', 'Robert Johnson');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('us-daiso-usa-2', 'cmredk6bd0001o60s0wo76qxr', 'Emily Davis');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('kr-daiso-korea-1', 'cmredk6bj0002o60st0gz3qju', 'Kim Min-jun');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('kr-daiso-korea-2', 'cmredk6bj0002o60st0gz3qju', 'Lee Seo-yeon');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('th-daiso-thailand-1', 'cmredk6bo0003o60s9i6jj6pj', 'Somchai Srisuk');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('th-daiso-thailand-2', 'cmredk6bo0003o60s9i6jj6pj', 'Nittaya Boonmee');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('vn-daiso-vietnam-1', 'cmredk6bt0004o60sbqoff9sc', 'Nguyen Van An');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('vn-daiso-vietnam-2', 'cmredk6bt0004o60sbqoff9sc', 'Tran Thi Hoa');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('id-daiso-indonesia-1', 'cmredk6bx0005o60s22dgq3xw', 'Budi Santoso');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('id-daiso-indonesia-2', 'cmredk6bx0005o60s22dgq3xw', 'Siti Rahayu');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('tw-daiso-taiwan-1', 'cmredk6c20006o60s8d5hj108', 'Chen Chih-Ming');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('tw-daiso-taiwan-2', 'cmredk6c20006o60s8d5hj108', 'Lin Mei-Ling');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('sg-daiso-singapore-1', 'cmredk6c60007o60sscvsnegq', 'Wei Ming Tan');
INSERT INTO public."AnnouncementRecipient" (id, "companyId", "contactName") VALUES ('sg-daiso-singapore-2', 'cmredk6c60007o60sscvsnegq', 'Priya Sharma');


ALTER TABLE public."AnnouncementRecipient" ENABLE TRIGGER ALL;

--
-- Data for Name: AnnouncementRecipientStatus; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."AnnouncementRecipientStatus" DISABLE TRIGGER ALL;

INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6h0000co60s7yejh9ec', 'seed-announcement-001', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6h8000eo60st4l8pa1x', 'seed-announcement-001', 'us-daiso-usa-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6hd000go60skauvgnml', 'seed-announcement-001', 'kr-daiso-korea-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6hh000io60su3yblerl', 'seed-announcement-001', 'th-daiso-thailand-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6hn000ko60soninhkyu', 'seed-announcement-001', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6hs000mo60sw2ioryuv', 'seed-announcement-001', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6hx000oo60szxqsto99', 'seed-announcement-001', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6i1000qo60sf0wodsg9', 'seed-announcement-001', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6i5000so60sipo2np9y', 'seed-announcement-001', 'jp-daiso-japan-trading-2', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6ia000uo60shjwm66ov', 'seed-announcement-001', 'us-daiso-usa-2', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6if000wo60shpspk2fd', 'seed-announcement-002', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6ij000yo60s7lyl5cwc', 'seed-announcement-002', 'jp-daiso-japan-trading-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6in0010o60s6iy0rcl9', 'seed-announcement-002', 'us-daiso-usa-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6is0012o60s0jrfdo5d', 'seed-announcement-002', 'us-daiso-usa-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6iw0014o60sfq9lt9j0', 'seed-announcement-002', 'kr-daiso-korea-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6j10016o60s74rldp3l', 'seed-announcement-002', 'th-daiso-thailand-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6j50018o60syfqjfzz2', 'seed-announcement-002', 'th-daiso-thailand-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6ja001ao60sesulae4y', 'seed-announcement-002', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6je001co60s4yf67vvk', 'seed-announcement-002', 'vn-daiso-vietnam-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6jj001eo60sni96ru5h', 'seed-announcement-002', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6jo001go60sbubnonfb', 'seed-announcement-002', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6js001io60sm429l8x8', 'seed-announcement-002', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6jx001ko60s9xzj6rg6', 'seed-announcement-003', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6k1001mo60siombig2f', 'seed-announcement-003', 'us-daiso-usa-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6k5001oo60smhtrv2xg', 'seed-announcement-003', 'kr-daiso-korea-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6ka001qo60ss8ciku8e', 'seed-announcement-003', 'th-daiso-thailand-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6kf001so60s70ho67ri', 'seed-announcement-003', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6kj001uo60skjg18czw', 'seed-announcement-003', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6ko001wo60sewgf4gj0', 'seed-announcement-003', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6kt001yo60sm0munmbz', 'seed-announcement-003', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6kz0020o60sziqxma5k', 'seed-announcement-004', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6l40022o60sijm4796t', 'seed-announcement-004', 'us-daiso-usa-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6la0024o60sadkhaahl', 'seed-announcement-004', 'kr-daiso-korea-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6lf0026o60spbaccn22', 'seed-announcement-004', 'th-daiso-thailand-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6lk0028o60s47k0l63q', 'seed-announcement-004', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6lp002ao60sn0gh0h5o', 'seed-announcement-004', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6lv002co60srcv4pheb', 'seed-announcement-004', 'id-daiso-indonesia-2', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6m0002eo60su1fk97o6', 'seed-announcement-004', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6m6002go60s77u5p6ug', 'seed-announcement-004', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6md002io60sk37igzgr', 'seed-announcement-005', 'jp-daiso-japan-trading-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6ml002ko60sp8gj6uiz', 'seed-announcement-005', 'us-daiso-usa-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6mq002mo60sid2yghag', 'seed-announcement-005', 'kr-daiso-korea-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6mv002oo60ski1s2rny', 'seed-announcement-005', 'th-daiso-thailand-1', '2026-07-02 03:00:00', '2026-07-02 05:00:00', NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6n0002qo60s2w4exzy2', 'seed-announcement-005', 'vn-daiso-vietnam-1', '2026-07-02 03:00:00', NULL, '2026-07-05 00:00:00');
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6n5002so60sgjx5q2gi', 'seed-announcement-005', 'id-daiso-indonesia-1', '2026-07-02 03:00:00', NULL, '2026-07-05 00:00:00');
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6na002uo60skvwuxtka', 'seed-announcement-005', 'tw-daiso-taiwan-1', '2026-07-02 03:00:00', NULL, NULL);
INSERT INTO public."AnnouncementRecipientStatus" (id, "announcementId", "recipientId", "confirmedAt", "completedAt", "reminderSentAt") VALUES ('cmredk6nf002wo60stv58gr8b', 'seed-announcement-005', 'sg-daiso-singapore-1', '2026-07-02 03:00:00', NULL, NULL);


ALTER TABLE public."AnnouncementRecipientStatus" ENABLE TRIGGER ALL;

--
-- Data for Name: ApplicantUser; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."ApplicantUser" DISABLE TRIGGER ALL;

INSERT INTO public."ApplicantUser" (id, email, "passwordHash", "displayName", "companyId", "createdAt") VALUES ('cmredk6cb0009o60sh08f1u4n', 'applicant@daiso-vietnam.example.com', '$2b$10$yOAFDi7ySQ7qfs.yXsBuNOfZ3ZFS6YJbdPq194ayEjCLACUfEnFda', 'Nguyen Van A', 'cmredk6bt0004o60sbqoff9sc', '2026-07-10 03:27:15.995');


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

INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-001', 'inquiry_method', 'ヘルプデスクへの問い合わせはどの方法で行えば良いですか。', 'ポータル上の「問い合わせ申請」ページから、案件種別・緊急度・内容を入力して送信してください。メールや電話での問い合わせは受け付けておりません。', '2026-07-10 03:27:16.429');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-002', 'inquiry_method', '複数の案件をまとめて1件の問い合わせとして送信できますか。', '1件の問い合わせにつき1つの案件のみご記入ください。複数の案件がある場合は、それぞれ個別に問い合わせを作成してください。', '2026-07-10 03:27:16.436');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-003', 'inquiry_method', '緊急度の高い問い合わせを行った場合、対応は早くなりますか。', '緊急度は対応の優先順位付けの参考情報として利用しますが、対応順序や対応完了時期を保証するものではありません。緊急性の高い内容は具体的な状況を本文に記載してください。', '2026-07-10 03:27:16.441');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-004', 'form_input', '問い合わせフォームの「原文言語」は何のために入力しますか。', '「原文言語」は、問い合わせ内容（自由記述）が元々どの言語で書かれているかを示す項目です。ヘルプデスク側での翻訳・確認作業に利用します。', '2026-07-10 03:27:16.445');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-005', 'form_input', '自由記述欄の文字数に上限はありますか。', '自由記述欄には文字数の上限があります。入力欄の下に表示される残り文字数を確認しながら入力し、上限を超える場合は内容を要約して記載してください。', '2026-07-10 03:27:16.45');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-006', 'form_input', '会社名や国の情報は毎回入力する必要がありますか。', '現在のフェーズでは問い合わせごとに会社名・国を入力していただく仕様となっています。入力内容に誤りがあると対応が遅れる可能性がありますので、正確にご入力ください。', '2026-07-10 03:27:16.454');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-007', 'status', '送信した問い合わせの対応状況はどこで確認できますか。', '「問い合わせ一覧」ページで、自社が送信した問い合わせの対応状況（新規・対応中・解決済み）を確認できます。', '2026-07-10 03:27:16.459');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-008', 'status', '「対応中」から「解決済み」に変わるまでの目安期間はどれくらいですか。', '案件の内容や混雑状況により対応期間は異なるため、一律の目安期間は設けておりません。進捗が気になる場合は、問い合わせ一覧の詳細画面をご確認ください。', '2026-07-10 03:27:16.463');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-009', 'status', '解決済みになった問い合わせについて、追加で質問したい場合はどうすれば良いですか。', '解決済みの問い合わせに対する追記機能は現在提供しておりません。追加で確認したい内容がある場合は、新規の問い合わせとして改めて送信してください。', '2026-07-10 03:27:16.468');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-010', 'other', 'ポータルの表示言語はどこで切り替えられますか。', '画面上部のヘッダーにある言語切り替えメニューから、日本語・英語の表示を切り替えることができます。', '2026-07-10 03:27:16.472');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-011', 'other', 'ポータルにログインできない場合はどうすれば良いですか。', 'ログインに関するトラブルは、社内の情報システム管理者または導入時にご案内した連絡先にお問い合わせください。本ポータルの問い合わせフォームでは対応できません。', '2026-07-10 03:27:16.476');
INSERT INTO public."Faq" (id, category, question, answer, "createdAt") VALUES ('seed-faq-012', 'other', 'リンク集やお知らせの内容はどのくらいの頻度で更新されますか。', 'リンク集やお知らせは、ヘルプデスク側で随時更新しています。更新頻度は内容によって異なり、一定のスケジュールは定めていません。', '2026-07-10 03:27:16.48');


ALTER TABLE public."Faq" ENABLE TRIGGER ALL;

--
-- Data for Name: HelpdeskStaff; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."HelpdeskStaff" DISABLE TRIGGER ALL;

INSERT INTO public."HelpdeskStaff" (id, email, "passwordHash", "displayName", "createdAt") VALUES ('cmredk6ci000ao60sz711djfc', 'staff@helpdesk.example.com', '$2b$10$yOAFDi7ySQ7qfs.yXsBuNOfZ3ZFS6YJbdPq194ayEjCLACUfEnFda', '田中 太郎', '2026-07-10 03:27:16.002');


ALTER TABLE public."HelpdeskStaff" ENABLE TRIGGER ALL;

--
-- Data for Name: Inquiry; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."Inquiry" DISABLE TRIGGER ALL;

INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('seed-inquiry-001', 'defect', 'high', 'Ho Chi Minh City', '納品された商品に破損が見られます。至急対応をお願いします。', 'ja', NULL, 'new', '2026-07-10 03:27:16.009', 'cmredk6bt0004o60sbqoff9sc', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-001', 'defect', 'high', 'Kanto', '店舗に納品された商品の一部に破損が見られます。至急対応をお願いします。', 'ja', NULL, 'new', '2026-06-28 18:15:00', 'cmredk6as0000o60sk8eqyjk4', 'Daiso Japan Trading Co.', 'JP', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-002', 'order', 'medium', 'West Coast', 'We would like to place an additional order for next month''s shipment.', 'en', '来月分の配送に向けて追加発注をお願いしたいです。', 'in_progress', '2026-06-25 23:30:00', 'cmredk6bd0001o60s0wo76qxr', 'Daiso USA Inc.', 'US', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-003', 'system', 'high', 'Seoul', '포털 시스템에 로그인할 수 없는 문제가 발생하고 있습니다.', 'ko', 'ポータルシステムにログインできない問題が発生しています。', 'new', '2026-06-29 11:45:00', 'cmredk6bj0002o60st0gz3qju', 'Daiso Korea Co., Ltd.', 'KR', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-004', 'other', 'low', 'Bangkok', '次回の販促キャンペーンに関する資料の共有をお願いしたいです。', 'ja', NULL, 'resolved', '2026-06-10 15:00:00', 'cmredk6bo0003o60s9i6jj6pj', 'Daiso Thailand Co., Ltd.', 'TH', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-005', 'defect', 'medium', 'Taipei', '部分商品外包裝有輕微破損，請確認是否需要更換。', 'zh', '一部商品の外装に軽微な破損が見られます。交換の必要があるかご確認ください。', 'in_progress', '2026-06-20 20:20:00', 'cmredk6c20006o60s8d5hj108', 'Daiso Taiwan Co., Ltd.', 'TW', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-006', 'order', 'low', 'Singapore', 'Could you confirm the estimated delivery date for order #4821?', 'en', '注文番号#4821の配送予定日をご確認いただけますでしょうか。', 'resolved', '2026-05-30 17:10:00', 'cmredk6c60007o60sscvsnegq', 'Daiso Singapore Pte. Ltd.', 'SG', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-007', 'system', 'low', 'Ho Chi Minh City', 'Trang cổng thông tin hiển thị chậm khi tải danh sách đơn hàng.', 'vi', 'ポータルサイトで注文一覧を読み込む際の表示が遅くなっています。', 'new', '2026-06-27 22:05:00', 'cmredk6bt0004o60sbqoff9sc', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-008', 'other', 'medium', 'Jakarta', 'Kami ingin menanyakan mengenai perpanjangan kontrak distribusi.', 'id', '販売契約の更新についてお伺いしたいです。', 'in_progress', '2026-06-15 14:40:00', 'cmredk6bx0005o60s22dgq3xw', 'Daiso Indonesia Co., Ltd.', 'ID', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-009', 'order', 'medium', 'Da Nang', 'Chúng tôi muốn đặt thêm hàng cho đợt giao tháng sau.', 'vi', '来月分の配送に向けて追加発注をお願いしたいです。', 'in_progress', '2026-06-22 18:30:00', 'cmredk6bt0004o60sbqoff9sc', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL);
INSERT INTO public."Inquiry" (id, category, urgency, "storeRegion", "originalText", "originalLanguage", "translatedText", status, "createdAt", "companyId", "submittedByCompanyName", "submittedByCountry", "claimedByStaffId", "claimedAt") VALUES ('inquiry-010', 'defect', 'high', 'Hanoi', 'Sản phẩm giao đến bị lỗi, đã được đổi trả và xử lý xong.', 'vi', '納品された商品に不具合があり、交換・対応は既に完了しております。', 'resolved', '2026-06-05 11:15:00', 'cmredk6bt0004o60sbqoff9sc', 'Daiso Vietnam Co., Ltd.', 'VN', NULL, NULL);


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

INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-001', '社内ポータル（グループウェア）', 'https://example.com/internal/groupware', 'internal', 'スケジュール管理・社内連絡に使用する社内ポータルです。', '2026-07-10 03:27:16.485');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-002', '販売管理システム', 'https://example.com/internal/sales-system', 'internal', '受発注状況・在庫状況を確認できる販売管理システムです。', '2026-07-10 03:27:16.492');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-003', '勤怠管理システム', 'https://example.com/internal/attendance', 'internal', NULL, '2026-07-10 03:27:16.496');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-004', 'Daiso公式サイト', 'https://example.com/external/daiso-official', 'external', '商品情報・店舗情報を掲載する公式サイトです。', '2026-07-10 03:27:16.501');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-005', '取引先向けサプライヤーポータル', 'https://example.com/external/supplier-portal', 'external', '取引先企業との連携に利用する外部ポータルです。', '2026-07-10 03:27:16.506');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-006', '為替レート情報サイト', 'https://example.com/external/exchange-rate', 'external', NULL, '2026-07-10 03:27:16.51');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-007', '販社担当者向け業務マニュアル', 'https://example.com/document/operation-manual.pdf', 'document', '日常業務の手順をまとめたマニュアルです。', '2026-07-10 03:27:16.514');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-008', '問い合わせ対応フローチャート', 'https://example.com/document/inquiry-flowchart.pdf', 'document', '問い合わせ受付から解決までの対応フローです。', '2026-07-10 03:27:16.518');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-009', 'よくある質問集（FAQ）', 'https://example.com/document/faq.pdf', 'document', NULL, '2026-07-10 03:27:16.523');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-010', 'ヘルプデスク連絡先一覧', 'https://example.com/other/contact-list', 'other', '各拠点のヘルプデスク窓口の連絡先一覧です。', '2026-07-10 03:27:16.527');
INSERT INTO public."Link" (id, title, url, category, description, "createdAt") VALUES ('seed-link-011', 'システム利用規約', 'https://example.com/other/terms-of-use', 'other', NULL, '2026-07-10 03:27:16.531');


ALTER TABLE public."Link" ENABLE TRIGGER ALL;

--
-- Data for Name: ReplyTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public."ReplyTemplate" DISABLE TRIGGER ALL;

INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-001', 'defect', '不良品対応（交換・返金案内）', 'この度はご不便をおかけし申し訳ございません。不良品の詳細を確認のうえ、交換または返金の対応についてご案内いたします。', '2026-07-10 03:27:16.535');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-002', 'defect', '不良品対応（詳細確認依頼）', 'お問い合わせいただいた不良の状況について、恐れ入りますが写真または詳細な症状をご共有いただけますでしょうか。確認のうえ改めてご案内いたします。', '2026-07-10 03:27:16.542');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-003', 'order', '発注内容確認（発送日未定）', 'お問い合わせいただいた発注内容について確認いたしました。発送予定日が確定次第、改めてご連絡いたします。', '2026-07-10 03:27:16.552');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-004', 'order', '発注内容確認（発送日確定案内）', 'ご注文いただいた商品の発送日が確定いたしましたのでご案内いたします。発送後、追跡番号を別途ご連絡いたします。', '2026-07-10 03:27:16.56');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-005', 'system', 'システム不具合（受付・調査中）', 'システムの不具合について報告いただきありがとうございます。現在状況を確認しておりますので、今しばらくお待ちください。', '2026-07-10 03:27:16.565');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-006', 'system', 'システム不具合（対応完了報告）', 'ご報告いただいたシステムの不具合について、修正対応が完了いたしましたのでご報告いたします。ご不便をおかけし申し訳ございませんでした。', '2026-07-10 03:27:16.571');
INSERT INTO public."ReplyTemplate" (id, category, name, body, "createdAt") VALUES ('seed-reply-template-007', 'other', 'その他問い合わせ（受付案内）', 'お問い合わせいただきありがとうございます。内容を確認のうえ、担当部署より改めてご連絡いたします。', '2026-07-10 03:27:16.576');


ALTER TABLE public."ReplyTemplate" ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--


