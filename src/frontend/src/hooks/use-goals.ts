import { createActor } from "@/backend";
import type {
  CreateDepositInput,
  CreateGoalInput,
  DepositView,
  GoalProgress,
  GoalStats,
  GoalView,
  TrendPoint,
  UpdateDepositInput,
} from "@/backend";
import type { TrendPeriod } from "@/backend";
import { todayDateText } from "@/lib/format";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const goalsKey = ["goals"] as const;
export const depositsKey = (goalId: bigint) =>
  ["deposits", goalId.toString()] as const;
export const progressKey = (goalId: bigint) =>
  ["progress", goalId.toString()] as const;
export const statsKey = (goalId: bigint) =>
  ["stats", goalId.toString()] as const;
export const trendKey = (goalId: bigint, period: TrendPeriod) =>
  ["trend", goalId.toString(), period] as const;

/** List every savings goal owned by the caller. */
export function useGoals() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GoalView[]>({
    queryKey: goalsKey,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listGoals();
    },
    enabled: !!actor && !isFetching,
  });
}

/** List the deposits of a goal, newest first. */
export function useDeposits(goalId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<DepositView[]>({
    queryKey: depositsKey(goalId ?? 0n),
    queryFn: async () => {
      if (!actor || goalId === null) return [];
      return actor.listDeposits(goalId);
    },
    enabled: !!actor && !isFetching && goalId !== null,
  });
}

/** Progress for a goal, computed against today's date. */
export function useProgress(goalId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GoalProgress | null>({
    queryKey: progressKey(goalId ?? 0n),
    queryFn: async () => {
      if (!actor || goalId === null) return null;
      return actor.getProgress(goalId, todayDateText());
    },
    enabled: !!actor && !isFetching && goalId !== null,
  });
}

/** Progress for every goal, keyed by goal id string. */
export function useGoalsProgress(goalIds: bigint[]) {
  const { actor, isFetching } = useActor(createActor);
  const key = goalIds.map((id) => id.toString()).join(",");
  return useQuery<Record<string, GoalProgress>>({
    queryKey: ["progress", "batch", key],
    queryFn: async () => {
      if (!actor) return {};
      const today = todayDateText();
      const entries = await Promise.all(
        goalIds.map(async (goalId) => {
          const progress = await actor.getProgress(goalId, today);
          return [goalId.toString(), progress] as const;
        }),
      );
      const result: Record<string, GoalProgress> = {};
      for (const [id, progress] of entries) {
        if (progress) result[id] = progress;
      }
      return result;
    },
    enabled: !!actor && !isFetching && goalIds.length > 0,
  });
}

/** Aggregate statistics for a goal. */
export function useStats(goalId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GoalStats | null>({
    queryKey: statsKey(goalId ?? 0n),
    queryFn: async () => {
      if (!actor || goalId === null) return null;
      return actor.getStats(goalId);
    },
    enabled: !!actor && !isFetching && goalId !== null,
  });
}

/** Deposit trend for a goal in the given period. */
export function useTrend(goalId: bigint | null, period: TrendPeriod) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TrendPoint[]>({
    queryKey: trendKey(goalId ?? 0n, period),
    queryFn: async () => {
      if (!actor || goalId === null) return [];
      return actor.getTrend(goalId, period);
    },
    enabled: !!actor && !isFetching && goalId !== null,
  });
}

function invalidateGoalData(
  queryClient: ReturnType<typeof useQueryClient>,
  goalId: bigint,
) {
  void queryClient.invalidateQueries({ queryKey: goalsKey });
  void queryClient.invalidateQueries({ queryKey: depositsKey(goalId) });
  void queryClient.invalidateQueries({ queryKey: progressKey(goalId) });
  void queryClient.invalidateQueries({ queryKey: statsKey(goalId) });
  void queryClient.invalidateQueries({
    queryKey: ["trend", goalId.toString()],
  });
}

/** Create a savings goal. */
export function useCreateGoal() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<GoalView, Error, CreateGoalInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.createGoal(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalsKey });
    },
  });
}

/** Delete a savings goal and all of its deposits. */
export function useDeleteGoal() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.deleteGoal(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalsKey });
    },
  });
}

/** Add a deposit to a goal. */
export function useAddDeposit() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<DepositView, Error, CreateDepositInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend belum siap.");
      const result = await actor.addDeposit(input);
      if (result.__kind__ === "err") {
        throw new Error(describeSavingsError(result.err));
      }
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      invalidateGoalData(queryClient, variables.goalId);
    },
  });
}

/** Update an existing deposit. */
export function useUpdateDeposit() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<
    DepositView,
    Error,
    { input: UpdateDepositInput; goalId: bigint }
  >({
    mutationFn: async ({ input }) => {
      if (!actor) throw new Error("Backend belum siap.");
      const result = await actor.updateDeposit(input);
      if (result.__kind__ === "err") {
        throw new Error(describeSavingsError(result.err));
      }
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      invalidateGoalData(queryClient, variables.goalId);
    },
  });
}

/** Delete a deposit. */
export function useDeleteDeposit() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { id: bigint; goalId: bigint }>({
    mutationFn: async ({ id }) => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.deleteDeposit(id);
    },
    onSuccess: (_data, variables) => {
      invalidateGoalData(queryClient, variables.goalId);
    },
  });
}

function describeSavingsError(error: {
  __kind__: string;
  invalidInput?: string;
}): string {
  switch (error.__kind__) {
    case "goalNotFound":
      return "Target tidak ditemukan.";
    case "depositNotFound":
      return "Setoran tidak ditemukan.";
    case "invalidInput":
      return error.invalidInput ?? "Data yang dimasukkan tidak valid.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}
