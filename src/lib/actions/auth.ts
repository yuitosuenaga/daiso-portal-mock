"use server";

import { AuthError } from "next-auth";

import { cookies } from "next/headers";

import { signIn } from "@/auth";
import {
  encodeLoginContext,
  type GoogleLoginPortal,
} from "@/lib/auth/google-login-policy";
import { GOOGLE_LOGIN_CONTEXT_COOKIE } from "@/lib/constants/google-login";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/constants/locales";
import { isLoginLocked } from "@/lib/server/login-throttle";
import { isGoogleLoginEnabled } from "@/lib/server/google-login-config";

export type LoginActionResult =
  | { error: "invalid_credentials" | "account_locked" }
  | undefined;

interface LoginActionInput {
  email: string;
  password: string;
  locale: string;
}

/**
 * 認証失敗時のエラー種別を決める。ロック中なら`account_locked`、それ以外は
 * `invalid_credentials`（アカウントの存否は区別しない。ロックは存在しないメールにも同様に掛かる）。
 */
async function resolveLoginError(
  portal: "applicant" | "helpdesk",
  email: string
): Promise<LoginActionResult> {
  try {
    if (await isLoginLocked(portal, email)) {
      return { error: "account_locked" };
    }
  } catch {
    // ロック状態を取得できなくても、通常の認証失敗として扱う
  }
  return { error: "invalid_credentials" };
}

/**
 * 申請者側企業ユーザーのログイン。成功時はAuth.jsが内部でリダイレクトを行う
 * （このServer Actionからは戻り値を返さない）。認証エラー時のみエラー結果を返す。
 */
export async function applicantLoginAction(
  input: LoginActionInput
): Promise<LoginActionResult> {
  try {
    await signIn("applicant-credentials", {
      email: input.email,
      password: input.password,
      redirectTo: `/${input.locale}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return resolveLoginError("applicant", input.email);
    }
    throw error;
  }
}

/** ヘルプデスク担当者のログイン。動作は`applicantLoginAction`と同様。 */
export async function helpdeskLoginAction(
  input: LoginActionInput
): Promise<LoginActionResult> {
  try {
    await signIn("helpdesk-credentials", {
      email: input.email,
      password: input.password,
      redirectTo: `/${input.locale}/helpdesk`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return resolveLoginError("helpdesk", input.email);
    }
    throw error;
  }
}

/**
 * Googleログインを開始する。どちらの画面から開始したか・ロケールをOAuth往復の間だけ
 * Cookieに保持し（signInコールバックで該当ポータルのアカウントのみ照会するため）、
 * Googleの認可画面へリダイレクトする。Googleログインが無効な環境では何もしない。
 * 許可ドメイン等の検証はここではなくAuth.jsのsignInコールバック（サーバー側）で行う。
 */
export async function googleLoginAction(input: {
  portal: GoogleLoginPortal;
  locale: string;
}): Promise<void> {
  if (!isGoogleLoginEnabled()) {
    return;
  }
  // クライアントから渡されたlocaleはそのままリダイレクト先に使わず、対応ロケールに限定する
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(input.locale)
    ? input.locale
    : DEFAULT_LOCALE;
  cookies().set(
    GOOGLE_LOGIN_CONTEXT_COOKIE,
    encodeLoginContext(input.portal, locale),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    }
  );
  await signIn("google", {
    redirectTo:
      input.portal === "helpdesk" ? `/${locale}/helpdesk` : `/${locale}`,
  });
}
