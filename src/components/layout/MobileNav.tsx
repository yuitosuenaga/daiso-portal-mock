"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { resolveActiveHref, type NavItem } from "./nav-items";

export interface MobileNavProps {
  items: NavItem[];
  /** 翻訳名前空間: "nav"（申請者側）または "helpdeskNav"（ヘルプデスク側） */
  namespace: "nav" | "helpdeskNav";
  /** アクティブ判定のルート: "/"（申請者側）または "/helpdesk"（ヘルプデスク側） */
  rootHref: string;
}

/**
 * モバイル幅（`md`未満）でのみ表示するハンバーガートグル＋ドロワー型ナビゲーション。
 * 申請者側・ヘルプデスク側の両ヘッダーから、それぞれのナビゲーション項目・翻訳名前空間・
 * ホーム遷移先を渡して共通利用する。
 */
export function MobileNav({ items, namespace, rootHref }: MobileNavProps) {
  const t = useTranslations(namespace);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeHref = resolveActiveHref(pathname, items, rootHref);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={t("openMenu")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent md:hidden"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-0 top-0 bottom-0 z-50 flex w-72 max-w-[80vw] flex-col bg-sidebar shadow-lg transition-transform duration-200",
            "data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0"
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {t("sidebarLabel")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label={t("closeMenu")}
                className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </DialogPrimitive.Close>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {items.map((item) => {
                const isActive = item.href === activeHref;
                const Icon = item.icon;

                return (
                  <li key={item.translationKey}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-base transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      <span>{t(item.translationKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
