"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export type LoginActionResult = { error: "invalid_credentials" } | undefined;

interface LoginActionInput {
  email: string;
  password: string;
  locale: string;
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
      return { error: "invalid_credentials" };
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
      return { error: "invalid_credentials" };
    }
    throw error;
  }
}
