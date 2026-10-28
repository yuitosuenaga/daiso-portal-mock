// セキュリティヘッダの定義。next.config.mjs（ESM・TS非対応）から読み込むため.mjsで書く。
// 副作用なしの純関数のみ。

/**
 * Content-Security-Policyを組み立てる。
 *
 * TODO(CSP厳格化): Next.jsのApp Routerはインラインスクリプト（flight data等）を出力するため、
 * nonceを導入するまでは script-src に 'unsafe-inline' が必要。同様に style-src も
 * Tailwind/next-fontのインラインstyleのため 'unsafe-inline'。nonce対応（middlewareでの
 * nonce発行 + 動的レンダリング化）が済んだらここを厳格化する。
 * 開発時（next dev）は React Refresh/HMR のため 'unsafe-eval' とws:接続も許可する。
 *
 * @param {{ isDev?: boolean }} [options]
 */
export function buildContentSecurityPolicy({ isDev = false } = {}) {
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // 添付画像のプレビュー（data:/blob:）と、Google由来の画像を許容
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    // PDF添付（data:URL）とGoogleドキュメント/ドライブの埋め込みプレビュー
    "frame-src": [
      "'self'",
      "data:",
      "blob:",
      "https://docs.google.com",
      "https://drive.google.com",
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Googleログインはリダイレクトでaccounts.google.comへ遷移する
    "form-action": ["'self'", "https://accounts.google.com"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

/**
 * 全ルートへ付与するセキュリティヘッダ一覧。
 * HSTSは本番のみ（localhostのHTTP開発環境へ付与するとブラウザに記憶されるため）。
 *
 * @param {{ isDev?: boolean }} [options]
 * @returns {{ key: string; value: string }[]}
 */
export function buildSecurityHeaders({ isDev = false } = {}) {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy({ isDev }) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ...(isDev
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ]),
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
}

/**
 * 同一オリジンのiframeでPDFを表示するルート（ファイル配信Route Handler）。
 * 全ルートのX-Frame-Options: DENY / frame-ancestors 'none' のままだとiframeに表示できない。
 * 後続のPRで配信ルートを追加するときはここへ足す。
 */
export const FILE_ROUTE_SOURCES = ["/api/documents/:id/file"];

/**
 * ファイル配信ルート用ヘッダ。全体用との差分はX-Frame-OptionsをSAMEORIGINに、
 * CSPのframe-ancestorsを'self'にする点のみ（同一オリジンの埋め込みだけ許可）。
 *
 * @param {{ isDev?: boolean }} [options]
 * @returns {{ key: string; value: string }[]}
 */
export function buildFileRouteSecurityHeaders({ isDev = false } = {}) {
  return buildSecurityHeaders({ isDev }).map((header) => {
    if (header.key === "X-Frame-Options") {
      return { key: header.key, value: "SAMEORIGIN" };
    }
    if (header.key === "Content-Security-Policy") {
      return {
        key: header.key,
        value: header.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
      };
    }
    return header;
  });
}

/**
 * next.configのheaders()へ渡すエントリ配列。同じキーは後に書いたエントリが上書きするため、
 * 全体用の後ろにファイルルート用を並べる。
 *
 * @param {{ isDev?: boolean }} [options]
 * @returns {{ source: string; headers: { key: string; value: string }[] }[]}
 */
export function buildHeadersConfig({ isDev = false } = {}) {
  return [
    { source: "/:path*", headers: buildSecurityHeaders({ isDev }) },
    ...FILE_ROUTE_SOURCES.map((source) => ({
      source,
      headers: buildFileRouteSecurityHeaders({ isDev }),
    })),
  ];
}
