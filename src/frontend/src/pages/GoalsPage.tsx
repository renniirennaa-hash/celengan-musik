import { EmptyState } from "@/components/EmptyState";
import { GoalCard } from "@/components/GoalCard";
import { GoalFormDialog } from "@/components/GoalFormDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateGoal, useGoals, useGoalsProgress } from "@/hooks/use-goals";
import { useNavigate } from "@tanstack/react-router";
import { PiggyBank, Plus } from "lucide-react";
import { useMemo, useState } from "react";

/** Goal list page with the create-goal entry point. */
export function GoalsPage() {
  const navigate = useNavigate();
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sortedGoals = useMemo(
    () =>
      [...(goals ?? [])].sort((a, b) =>
        a.createdAt === b.createdAt ? 0 : a.createdAt > b.createdAt ? -1 : 1,
      ),
    [goals],
  );

  const goalIds = useMemo(
    () => sortedGoals.map((goal) => goal.id),
    [sortedGoals],
  );
  const { data: progressById } = useGoalsProgress(goalIds);

  const handleCreate = (values: {
    name: string;
    photoUrl: string;
    targetAmount: bigint;
    startDate: string;
    targetDate: string;
  }) => {
    setFormError(null);
    createGoal.mutate(values, {
      onSuccess: (goal) => {
        setFormOpen(false);
        void navigate({
          to: "/target/$goalId",
          params: { goalId: goal.id.toString() },
        });
      },
      onError: (error) => setFormError(error.message),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-eyebrow">Daftar target</span>
          <h1 className="mt-1 font-display text-2xl font-semibold md:text-3xl">
            Target Tabungan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih target untuk melihat detail, progres, dan riwayat setoran.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full px-5"
          data-ocid="goals.create_button"
          onClick={() => {
            setFormError(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Target baru
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => `goals-skeleton-${i}`).map(
            (id) => (
              <Skeleton key={id} className="h-64 rounded-3xl" />
            ),
          )}
        </div>
      ) : sortedGoals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Belum ada target tabungan"
          description="Buat target pertamamu dengan mengunggah foto, menentukan nominal, dan menetapkan tanggal tujuan."
          actionLabel="Buat target pertama"
          onAction={() => {
            setFormError(null);
            setFormOpen(true);
          }}
          ocid="goals.empty_state"
        />
      ) : (
        <div
          data-ocid="goals.list"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sortedGoals.map((goal, index) => (
            <GoalCard
              key={goal.id.toString()}
              goal={goal}
              progress={progressById?.[goal.id.toString()] ?? null}
              index={index}
              onOpen={(goalId) =>
                void navigate({
                  to: "/target/$goalId",
                  params: { goalId: goalId.toString() },
                })
              }
            />
          ))}
        </div>
      )}

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isPending={createGoal.isPending}
        submitError={formError}
      />
    </div>
  );
}
