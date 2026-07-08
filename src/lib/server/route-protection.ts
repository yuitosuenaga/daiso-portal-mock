import "server-only";

import type { SessionClaims } from "@/types/session";

function isPublicAuthPath(pathWithoutLocale: string): boolean {
  return (
    pathWithoutLocale === "/login" || pathWithoutLocale === "/helpdesk/login"
  );
}

function isHelpdeskPath(pathWithoutLocale: string): boolean {
  return (
    pathWithoutLocale === "/helpdesk" ||
    pathWithoutLocale.startsWith("/helpdesk/")
  );
}

/**
 * ロケールプレフィックス付きのパスと現在のセッションクレームから、
 * ログイン画面へリダイレクトすべきパスを求める。リダイレクトが不要な場合はnullを返す。
 */
export function resolveLoginRedirectPath(
  pathname: string,
  claims: SessionClaims | null | undefined,
  locales: readonly string[],
  defaultLocale: string
): string | null {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  const hasLocalePrefix = locales.includes(maybeLocale);
  const locale = hasLocalePrefix ? maybeLocale : defaultLocale;
  const pathWithoutLocale = hasLocalePrefix
    ? "/" + segments.slice(2).join("/")
    : pathname;
  const normalizedPath =
    pathWithoutLocale === "" || pathWithoutLocale === "/"
      ? "/"
      : pathWithoutLocale.replace(/\/$/, "");

  if (isPublicAuthPath(normalizedPath)) {
    return null;
  }

  if (isHelpdeskPath(normalizedPath)) {
    if (!claims || claims.role !== "helpdesk") {
      return `/${locale}/helpdesk/login`;
    }
    return null;
  }

  if (!claims || claims.role !== "applicant") {
    return `/${locale}/login`;
  }

  return null;
}
