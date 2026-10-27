import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import { authConfig } from "@/auth.config";
import {
  buildGoogleLoginErrorPath,
  decodeLoginContext,
} from "@/lib/auth/google-login-policy";
import { GOOGLE_LOGIN_CONTEXT_COOKIE } from "@/lib/constants/google-login";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/constants/locales";
import {
  authorizeApplicantCredentials,
  authorizeHelpdeskCredentials,
} from "@/lib/server/authorize";
import { recordAuthEvent, hashIdentifier } from "@/lib/server/auth-audit";
import { runProtectedCredentialsLogin } from "@/lib/server/login-throttle";
import { logger } from "@/lib/server/logger";
import { authorizeGoogleLogin } from "@/lib/server/google-authorize";
import {
  getAllowedEmailDomains,
  getHelpdeskAutoProvisionDomains,
  isGoogleLoginEnabled,
} from "@/lib/server/google-login-config";

/**
 * Prisma・bcryptjsに依存する完全な認証設定（Node.jsランタイム専用）。
 * Route Handler・Server Action・Server Componentから利用する。
 * Middlewareからは`auth.config.ts`（Edge Runtime対応版）を利用する。
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Googleログインの許可判定。許可ドメイン・email_verified・既存アカウントとの突き合わせを
     * すべてここ（サーバー側）で検証する。`hd`パラメータはヒントに過ぎず検証の代わりにしない。
     * 通過時は`user`にセッションクレームを書き込み、`jwt`コールバックがトークンへ取り込む。
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }
      const context = decodeLoginContext(
        (await cookies()).get(GOOGLE_LOGIN_CONTEXT_COOKIE)?.value,
        SUPPORTED_LOCALES,
        DEFAULT_LOCALE
      );
      const googleEmail = profile?.email ?? user.email;
      const identifierHash = googleEmail ? hashIdentifier(googleEmail) : null;
      let result: Awaited<ReturnType<typeof authorizeGoogleLogin>>;
      try {
        result = await authorizeGoogleLogin({
          email: googleEmail,
          emailVerified: profile?.email_verified,
          portal: context.portal,
          allowedDomains: getAllowedEmailDomains(),
          // Profileのhdは型定義が無くunknown。実行時に文字列のときだけ渡す
          hostedDomain: typeof profile?.hd === "string" ? profile.hd : null,
          name: typeof profile?.name === "string" ? profile.name : null,
          autoProvisionDomains: getHelpdeskAutoProvisionDomains(),
        });
      } catch (error) {
        // DB障害等。fail closedで拒否し、監査を残す（例外の詳細にメールが含まれうるため種別のみ記録）
        logger.error("[auth] authorizeGoogleLogin failed", {
          errorName: error instanceof Error ? error.name : typeof error,
          code: (error as { code?: unknown } | null)?.code,
        });
        await recordAuthEvent({
          type: "login_failure",
          method: "google",
          portal: context.portal,
          identifierHash,
          reason: "authorize_error",
        });
        // 画面のエラー分類は増やさず、汎用の「ログインできない」系コードで拒否する
        return buildGoogleLoginErrorPath(
          context.portal,
          context.locale,
          "not_registered"
        );
      }
      if (!result.ok) {
        await recordAuthEvent({
          type: "login_failure",
          method: "google",
          portal: context.portal,
          identifierHash,
          reason: result.error,
        });
        return buildGoogleLoginErrorPath(
          context.portal,
          context.locale,
          result.error
        );
      }
      if (result.provisioned) {
        await recordAuthEvent({
          type: "account_provisioned",
          method: "google",
          portal: context.portal,
          userId: result.user.id,
          identifierHash,
          reason: "google_auto",
        });
      }
      await recordAuthEvent({
        type: "login_success",
        method: "google",
        portal: context.portal,
        userId: result.user.id,
        identifierHash,
      });
      // Googleのプロフィール（name/image等）をセッションに残さず、既存と同じ形に置き換える
      for (const key of Object.keys(user)) {
        delete (user as unknown as Record<string, unknown>)[key];
      }
      Object.assign(user, result.user);
      return true;
    },
  },
  providers: [
    ...(isGoogleLoginEnabled()
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            // ヒントのみ（アカウント選択画面の絞り込み）。検証はsignInコールバックで行う
            authorization: {
              params: {
                prompt: "select_account",
                ...(getAllowedEmailDomains().length === 1
                  ? { hd: getAllowedEmailDomains()[0] }
                  : {}),
              },
            },
          }),
        ]
      : []),
    Credentials({
      id: "applicant-credentials",
      name: "Applicant",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }
        const { email, password } = credentials;
        return runProtectedCredentialsLogin("applicant", email, () =>
          authorizeApplicantCredentials(email, password)
        );
      },
    }),
    Credentials({
      id: "helpdesk-credentials",
      name: "Helpdesk Staff",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }
        const { email, password } = credentials;
        return runProtectedCredentialsLogin("helpdesk", email, () =>
          authorizeHelpdeskCredentials(email, password)
        );
      },
    }),
  ],
});
