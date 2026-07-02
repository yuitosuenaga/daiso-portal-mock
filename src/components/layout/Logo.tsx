import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2 text-primary", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 19 12 12 20 19" />
        <polyline points="6 13 12 7.5 18 13" />
        <polyline points="8 7 12 3.5 16 7" />
      </svg>
      <span className="text-lg font-bold tracking-wide">DAISO</span>
    </div>
  );
}
