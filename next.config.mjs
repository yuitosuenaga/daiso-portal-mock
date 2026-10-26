import createNextIntlPlugin from "next-intl/plugin";

import { buildSecurityHeaders } from "./src/lib/security-headers.mjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // コンテナ（Dockerfile）向けに最小構成で出力する
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          isDev: process.env.NODE_ENV !== "production",
        }),
      },
    ];
  },
  experimental: {
    serverActions: {
      // 添付ファイル付きの返信（Base64データURL化で最大約34MB相当）を送信できるよう、
      // Next.jsのデフォルト上限（1MB）を引き上げる。inquiry-formspecの添付ファイル上限と整合させる
      bodySizeLimit: "40mb",
    },
  },
};

export default withNextIntl(nextConfig);
