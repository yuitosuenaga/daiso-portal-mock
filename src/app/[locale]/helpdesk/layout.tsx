interface HelpdeskLayoutProps {
  children: React.ReactNode;
}

/**
 * `/helpdesk`配下の共通レイアウト。シェル（サイドバー等）はログイン後の
 * `(dashboard)`グループ側で適用するため、ここではパススルーのみを行う
 * （ログイン画面にシェルを表示しないため）。
 */
export default function HelpdeskLayout({ children }: HelpdeskLayoutProps) {
  return <>{children}</>;
}
