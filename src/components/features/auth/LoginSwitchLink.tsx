import { ArrowLeftRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface LoginSwitchLinkProps {
  targetHref: "/login" | "/helpdesk/login";
  label: string;
}

export function LoginSwitchLink({ targetHref, label }: LoginSwitchLinkProps) {
  return (
    <Link
      href={targetHref}
      className="fixed top-4 right-4 z-10 flex items-center gap-1.5 text-base text-primary underline-offset-4 hover:underline"
    >
      <ArrowLeftRight className="h-5 w-5 sm:hidden" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </Link>
  );
}
