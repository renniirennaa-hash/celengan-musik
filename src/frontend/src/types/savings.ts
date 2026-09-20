import type {
  DepositView,
  GoalProgress,
  GoalStats,
  GoalView,
  TrendPoint,
} from "@/backend";

export type { DepositView, GoalProgress, GoalStats, GoalView, TrendPoint };

export type TrendMode = "daily" | "monthly";

export interface GoalFormValues {
  name: string;
  photoUrl: string;
  targetAmount: string;
  startDate: string;
  targetDate: string;
}

export interface DepositFormValues {
  amount: string;
  date: string;
  note: string;
}

export interface GoalWithProgress {
  goal: GoalView;
  progress: GoalProgress | null;
}
