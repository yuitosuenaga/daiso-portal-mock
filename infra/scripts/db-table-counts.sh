#!/usr/bin/env bash
# Cloud SQL の全テーブルの行数を出力する（バックアップ復元後の突合用。SELECT のみ）。
#
# 使い方:
#   PROJECT=rvp-ai-proto-camp ./infra/scripts/db-table-counts.sh <接続名 project:region:instance>
#   （任意: DATABASE_URL_SECRET=portal-mock-database-url。復元先は元と同じ DB ユーザー・パスワードで入る想定）
#
# 機密値の扱い: DATABASE_URL は画面・ファイルに出さない。Auth Proxy は終了時に必ず停止し、ソケットを削除する。
# 前提: gcloud / cloud-sql-proxy / node が使え、リポジトリ直下で `npm install` 済み（@prisma/client が生成済み）であること。
set -euo pipefail

CONN="${1:?usage: db-table-counts.sh <project:region:instance>}"
PROJECT="${PROJECT:?PROJECT を指定すること}"
SECRET="${DATABASE_URL_SECRET:-portal-mock-database-url}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
SOCK="$(mktemp -d)"
PROXY_PID=""

cleanup() {
  [ -n "$PROXY_PID" ] && kill "$PROXY_PID" 2>/dev/null || true
  rm -rf "$SOCK"
  unset DB_URL DATABASE_URL
}
trap cleanup EXIT

DB_URL="$(gcloud secrets versions access latest --secret "$SECRET" --project "$PROJECT")"
cloud-sql-proxy --unix-socket "$SOCK" "$CONN" >/dev/null 2>&1 &
PROXY_PID=$!
for _ in $(seq 1 30); do
  [ -S "$SOCK/$CONN/.s.PGSQL.5432" ] && break
  sleep 1
done
export DATABASE_URL="${DB_URL%%\?host=*}?host=$SOCK/$CONN"

# @prisma/client を解決させるため、リポジトリ直下に一時コピーして実行する（終了時に削除）
TMP_MJS="$REPO/.db-table-counts.tmp.mjs"
cp "$HERE/db-table-counts.mjs" "$TMP_MJS"
trap 'rm -f "$TMP_MJS"; cleanup' EXIT
cd "$REPO"
node "$TMP_MJS"
