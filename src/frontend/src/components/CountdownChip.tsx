import { formatDaysRemaining } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

interface CountdownChipProps {
  daysRemaining: number;
  isReached: boolean;
  isOverdue: boolean;
  className?: string;
}

/** Countdown chip with distinct states for reached, overdue, and active goals. */
export function CountdownChip({
  daysRemaining,
  isReached,
  isOverdue,
  className,
}: CountdownChipProps) {
  if (isReached) {
    return (
      <span
        data-ocid="goal.countdown_chip"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary",
          className,
        )}
      >
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Target tercapai
      </span>
    );
  }

  if (isOverdue) {
    return (
      <span
        data-ocid="goal.countdown_chip"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive",
          className,
        )}
      >
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        {formatDaysRemaining(daysRemaining)}
      </span>
    );
  }

  return (
    <span
      data-ocid="goal.countdown_chip"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent",
        className,
      )}
    >
      <CalendarClock className="size-3.5" aria-hidden="true" />
      {formatDaysRemaining(daysRemaining)}
    </span>
  );
}
