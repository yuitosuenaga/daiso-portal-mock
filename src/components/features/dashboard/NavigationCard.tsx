import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export type NavigationCardBadgeVariant = "default" | "urgency-high" | "muted";

export interface NavigationCardBadge {
  count: number;
  variant: NavigationCardBadgeVariant;
}

export interface NavigationCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: NavigationCardBadge;
}

export function NavigationCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
}: NavigationCardProps) {
  const showBadge = badge !== undefined && badge.count > 0;
  const accessibleLabel = showBadge
    ? `${title}. ${description} (${badge.count})`
    : `${title}. ${description}`;

  return (
    <Link
      href={href}
      aria-label={accessibleLabel}
      className="group block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-colors group-hover:border-primary group-hover:bg-accent">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary group-hover:bg-card">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {showBadge ? (
            <Badge variant={badge.variant} aria-hidden="true">
              {badge.count}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
