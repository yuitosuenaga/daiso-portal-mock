"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";

/**
 * フォーム送信成功後の画面遷移を行い、遷移が終わるまでの二重送信を防ぐフック。
 *
 * onSubmit が resolve すると react-hook-form の isSubmitting は false に戻るが、
 * 遷移が完了するまでの間は画面が残り、送信ボタンが再び押せてしまう。
 * useTransition の isPending を遷移中フラグとして使い、遷移が終われば自動で元に戻る。
 * （push が例外を投げた場合は React が error boundary に流すため、フォーム自体が差し替わる）
 * navigatingRef は、isPending の再レンダリング前の連続呼び出し/連続送信を防ぐ。
 */
export function useNavigateAfterSubmit() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const navigatingRef = useRef(false);

  useEffect(() => {
    // 遷移が終わったら再入防止を解除する
    if (!isNavigating) {
      navigatingRef.current = false;
    }
  }, [isNavigating]);

  const navigate = useCallback(
    (href: string) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      startTransition(() => router.push(href));
    },
    [router]
  );

  /** onSubmit の先頭で `if (isNavigationLocked()) return` として使う */
  const isNavigationLocked = useCallback(() => navigatingRef.current, []);

  return { navigate, isNavigating, isNavigationLocked };
}
