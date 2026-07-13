import type { NextAuthConfig } from "next-auth";

import type { SessionClaims } from "@/types/session";

declare module "next-auth" {
  interface Session {
    claims: (SessionClaims & { id: string }) | null;
  }
}

/**
 * Edge Runtime（Middleware）でも安全に読み込める設定のみを含む。
 * Prisma・bcryptjsに依存するCredentials Providerの`authorize()`実装は
 * `src/auth.ts`側にのみ追加し、この設定には含めない
 * （MiddlewareはJWTセッションの検証のみ行い、認証情報の照合は行わないため）。
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        Object.assign(token, user);
      }
      return token;
    },
    session({ session, token }) {
      session.claims = token as unknown as SessionClaims & { id: string };
      return session;
    },
  },
};
