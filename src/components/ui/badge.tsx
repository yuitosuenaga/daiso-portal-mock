import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        maintenance: "bg-accent text-accent-foreground",
        policy: "bg-secondary text-secondary-foreground",
        incident: "bg-destructive text-destructive-foreground",
        other: "bg-muted text-muted-foreground",
        "status-new": "bg-secondary text-secondary-foreground",
        "status-in_progress": "bg-accent text-accent-foreground",
        "status-resolved": "bg-muted text-muted-foreground",
        "urgency-high": "bg-destructive text-destructive-foreground",
        "urgency-medium": "bg-secondary text-secondary-foreground",
        "urgency-low": "bg-muted text-muted-foreground",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "other",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
