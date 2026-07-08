import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

import { authConfig } from "./auth.config";
import { routing } from "./i18n/routing";
import { resolveLoginRedirectPath } from "./lib/server/route-protection";

const intlMiddleware = createMiddleware(routing);

// Middleware（Edge Runtime）ではJWTセッションの検証のみを行うため、
// Prisma・bcryptjsを含まないEdge対応版の設定（`auth.config.ts`）から`auth()`を構築する。
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const intlResponse = intlMiddleware(request);

  // next-intlがロケール正規化のためにリダイレクトを返す場合、認証チェックは
  // ロケール付きパスへの再アクセス時に行うため、そのまま返す。
  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  const redirectPath = resolveLoginRedirectPath(
    request.nextUrl.pathname,
    request.auth?.claims ?? null,
    routing.locales,
    routing.defaultLocale
  );

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return intlResponse;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
