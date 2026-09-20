import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  ocid?: string;
}

/** Shared empty-state block with a visual, headline, and primary action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ocid = "empty_state",
}: EmptyStateProps) {
  return (
    <div
      data-ocid={ocid}
      className={cn(
        "surface-card flex flex-col items-center rounded-3xl px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full px-5"
          data-ocid="empty_state.primary_button"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
