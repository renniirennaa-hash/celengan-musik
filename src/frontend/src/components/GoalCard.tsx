import { CountdownChip } from "@/components/CountdownChip";
import { formatPercent, formatRupiah, formatShortDateText } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GoalProgress, GoalView } from "@/types/savings";
import { ImageOff, Target } from "lucide-react";

interface GoalCardProps {
  goal: GoalView;
  progress: GoalProgress | null;
  index: number;
  onOpen: (goalId: bigint) => void;
}

/** Clickable goal card: photo, name, progress bar, and countdown. */
export function GoalCard({ goal, progress, index, onOpen }: GoalCardProps) {
  const percentage = progress?.percentage ?? 0;
  const clamped = Math.max(0, Math.min(100, percentage));
  const total = progress?.totalDeposits ?? 0n;
  const isReached = progress?.isReached ?? false;

  return (
    <button
      type="button"
      data-ocid={`goal.item.${index + 1}`}
      onClick={() => onOpen(goal.id)}
      className={cn(
        "surface-card group flex w-full flex-col overflow-hidden rounded-3xl text-left transition-smooth",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {goal.photoUrl ? (
          <img
            src={goal.photoUrl}
            alt={`Foto target ${goal.name}`}
            loading="lazy"
            className="size-full object-cover transition-smooth group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="truncate font-display text-base font-semibold text-white drop-shadow">
            {goal.name}
          </span>
          {progress ? (
            <CountdownChip
              daysRemaining={Number(progress.daysRemaining)}
              isReached={isReached}
              isOverdue={progress.isOverdue}
              className="shrink-0 backdrop-blur"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-figure text-lg font-semibold text-foreground">
            {formatRupiah(total)}
          </span>
          <span className="text-xs text-muted-foreground">
            dari {formatRupiah(goal.targetAmount)}
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          tabIndex={-1}
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progres ${goal.name}`}
        >
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-[width] duration-700 ease-out",
              isReached && "glow-primary",
            )}
            style={{ width: `${clamped}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <Target className="size-3.5" aria-hidden="true" />
            {formatPercent(percentage)}
          </span>
          <span className="text-muted-foreground">
            {formatShortDateText(goal.targetDate)}
          </span>
        </div>
      </div>
    </button>
  );
}
