import "server-only";

import { createHash, timingSafeEqual } from "crypto";

import type { NextRequest } from "next/server";

/**
 * リクエストヘッダーから、Cronエンドポイント認証用のシークレット候補を優先順に取り出す。
 * Cloud SchedulerのOIDC利用時は`Authorization: Bearer <IDトークン>`が付与されるため、
 * アプリ層のシークレットである`x-cron-secret`を先に照合し、`Authorization: Bearer <secret>`
 * 単独（従来方式）も候補として受け付ける（要件38.10）。
 */
function extractSecretCandidates(request: NextRequest): string[] {
  const candidates: string[] = [];
  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret) {
    candidates.push(headerSecret);
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice("Bearer ".length);
    if (bearer) {
      candidates.push(bearer);
    }
  }
  return candidates;
}

/**
 * 2つの文字列をタイミング攻撃に耐性のある方法で比較する。単純な`===`比較は文字列長・
 * 一致した先頭文字数に応じて処理時間が変わりうるため、両者を固定長（SHA-256、32byte）に
 * ハッシュ化してから`crypto.timingSafeEqual`で比較する。これにより、入力長の違いによる
 * 早期リターン（それ自体がタイミングのサイドチャネルになりうる）も発生しない。
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * CronエンドポイントのCRON_SECRET認証。CRON_SECRET未設定の環境ではエンドポイントを無効化し
 * （常にfalse）、誤って無認証で叩けないようにする（要件38.10）。呼び出し側は、未設定・不一致を
 * 区別せず同じ401・固定文言で応答すること（設定状態を外部へ開示しない）。
 */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }
  // 全候補を定数時間比較で評価し、早期リターンによるタイミング差を作らない。
  return extractSecretCandidates(request)
    .map((candidate) => timingSafeEqualStrings(candidate, cronSecret))
    .some(Boolean);
}
