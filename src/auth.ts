import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import {
  authorizeApplicantCredentials,
  authorizeHelpdeskCredentials,
} from "@/lib/server/authorize";

/**
 * Prisma・bcryptjsに依存する完全な認証設定（Node.jsランタイム専用）。
 * Route Handler・Server Action・Server Componentから利用する。
 * Middlewareからは`auth.config.ts`（Edge Runtime対応版）を利用する。
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
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
        return authorizeApplicantCredentials(
          credentials.email,
          credentials.password
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
        return authorizeHelpdeskCredentials(
          credentials.email,
          credentials.password
        );
      },
    }),
  ],
});
