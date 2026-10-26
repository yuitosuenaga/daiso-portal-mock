#!/usr/bin/env bash
# portal-mock の機密値（AUTH_SECRET / DBパスワード / DATABASE_URL）を新しい値へローテーションする。
#
# 処理順（この順序が重要）:
#   (a) AUTH_SECRET を生成し Secret Manager に新 version として登録
#   (b) DBパスワードを生成（英数字32桁）
#   (c) 新 DATABASE_URL を組み立て Secret Manager に新 version として登録
#   (d) その後に Cloud SQL ユーザーのパスワードを変更
#
# 冪等性: 再実行すると値を再生成し (a)〜(d) をやり直す。(c) 成功後に (d) が失敗した場合、
#   secret の最新 version と DB のパスワードが不一致になるが、再実行すれば最後に両者が一致する。
#   Cloud Run が secret の `latest` を読むのは新 revision 起動時のみのため、
#   このスクリプトが正常終了するまで Cloud Run の apply（secret 参照切替）をしないこと。
#
# 機密値の扱い:
#   - 値は echo / ログ出力しない。secret への登録は標準入力（--data-file=-）経由。
#   - 注意（避けられない点）: `gcloud sql users set-password --password=...` はパスワードを
#     コマンドライン引数で渡す仕様のため、実行中の数秒間、同一ホストの `ps` 等でプロセス引数として
#     見える。共有ホストでは実行しないこと（個人の WSL 等で実行する想定）。
#
# 使い方:
#   PROJECT=rvp-ai-proto-camp REGION=asia-northeast1 INSTANCE=portal-mock-backend-db \
#   DB_USER=postgres DB_NAME=portal_mock \
#   CONNECTION_NAME=rvp-ai-proto-camp:asia-northeast1:portal-mock-backend-db \
#   ./infra/scripts/rotate-secrets.sh
#   （引数でも可: --project --region --instance --db-user --db-name --connection-name）
#
# 前提: gcloud / openssl が使え、secret 枠（portal-mock-auth-secret / portal-mock-database-url）が
#   作成済みであること（terraform apply -target=module.secrets）。

set -euo pipefail
set +x

PROJECT="${PROJECT:-}"
REGION="${REGION:-asia-northeast1}"
INSTANCE="${INSTANCE:-}"
DB_USER="${DB_USER:-}"
DB_NAME="${DB_NAME:-}"
CONNECTION_NAME="${CONNECTION_NAME:-}"
AUTH_SECRET_ID="${AUTH_SECRET_ID:-portal-mock-auth-secret}"
DATABASE_URL_SECRET_ID="${DATABASE_URL_SECRET_ID:-portal-mock-database-url}"

usage() {
  echo "usage: $0 [--project P] [--region R] [--instance I] [--db-user U] [--db-name N] [--connection-name C]" >&2
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --project) PROJECT="${2:-}"; shift 2 ;;
    --region) REGION="${2:-}"; shift 2 ;;
    --instance) INSTANCE="${2:-}"; shift 2 ;;
    --db-user) DB_USER="${2:-}"; shift 2 ;;
    --db-name) DB_NAME="${2:-}"; shift 2 ;;
    --connection-name) CONNECTION_NAME="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

for v in PROJECT INSTANCE DB_USER DB_NAME CONNECTION_NAME; do
  if [ -z "${!v}" ]; then
    echo "missing: $v" >&2
    usage
  fi
done

cleanup() {
  unset AUTH_SECRET_VALUE DB_PASSWORD DATABASE_URL_VALUE 2>/dev/null || true
}
trap cleanup EXIT

echo "対象: project=$PROJECT instance=$INSTANCE db_user=$DB_USER db_name=$DB_NAME"
echo "実行内容: secret($AUTH_SECRET_ID, $DATABASE_URL_SECRET_ID) に新 version を登録し、"
echo "          その後 Cloud SQL ユーザー $DB_USER のパスワードを変更します（旧値には戻せません）。"
printf '続行するには YES と入力: '
read -r answer
if [ "$answer" != "YES" ]; then
  echo "中止しました。"
  exit 1
fi

# (a) AUTH_SECRET
AUTH_SECRET_VALUE="$(openssl rand -base64 32)"
printf '%s' "$AUTH_SECRET_VALUE" | gcloud secrets versions add "$AUTH_SECRET_ID" \
  --project "$PROJECT" --data-file=- >/dev/null
unset AUTH_SECRET_VALUE
echo "[a] $AUTH_SECRET_ID に新 version を登録しました"

# (b) DBパスワード（英数字32桁。URL に埋め込むため記号なし）
DB_PASSWORD="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-32)"
if [ "${#DB_PASSWORD}" -ne 32 ]; then
  echo "パスワード生成に失敗しました" >&2
  exit 1
fi

# (c) DATABASE_URL を登録（Cloud SQL ソケット接続形式）
DATABASE_URL_VALUE="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
printf '%s' "$DATABASE_URL_VALUE" | gcloud secrets versions add "$DATABASE_URL_SECRET_ID" \
  --project "$PROJECT" --data-file=- >/dev/null
unset DATABASE_URL_VALUE
echo "[c] $DATABASE_URL_SECRET_ID に新 version を登録しました"

# (d) 登録後に DB パスワードを変更（引数渡しになる点は冒頭コメント参照）
gcloud sql users set-password "$DB_USER" \
  --instance "$INSTANCE" --project "$PROJECT" --password "$DB_PASSWORD" >/dev/null
unset DB_PASSWORD
echo "[d] Cloud SQL ユーザー $DB_USER のパスワードを変更しました"

echo "完了。次は terraform の全体 apply で Cloud Run を secret 参照へ切り替えてください。"
