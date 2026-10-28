import createNextIntlPlugin from "next-intl/plugin";

import { buildHeadersConfig } from "./src/lib/security-headers.mjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // コンテナ（Dockerfile）向けに最小構成で出力する
  output: "standalone",
  async headers() {
    return buildHeadersConfig({ isDev: process.env.NODE_ENV !== "production" });
  },
  experimental: {
    serverActions: {
      // 添付ファイル付きの送信（合計上限20MiBがBase64化で約26.7MiB）を送信できるよう、
      // Next.jsのデフォルト上限（1MB）を引き上げる。ATTACHMENT_MAX_TOTAL_SIZE_BYTES と整合させ、
      // Cloud Runの32MiB上限より前にアプリ側でも弾けるよう約28MBに抑える
      bodySizeLimit: "28mb",
    },
  },
};

export default withNextIntl(nextConfig);
