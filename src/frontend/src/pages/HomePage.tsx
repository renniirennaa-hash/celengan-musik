import { CountdownChip } from "@/components/CountdownChip";
import { EmptyState } from "@/components/EmptyState";
import { GoalCard } from "@/components/GoalCard";
import { GoalFormDialog } from "@/components/GoalFormDialog";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateGoal,
  useGoals,
  useGoalsProgress,
  useProgress,
} from "@/hooks/use-goals";
import { formatPercent, formatRupiah, formatShortDateText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, PiggyBank, Plus, Sparkles, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

/** Dashboard: aggregate summary plus the most recent goals. */
export function HomePage() {
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

  const featured = sortedGoals[0] ?? null;
  const { data: featuredProgress } = useProgress(featured?.id ?? null);

  const goalIds = useMemo(
    () => sortedGoals.slice(0, 3).map((goal) => goal.id),
    [sortedGoals],
  );
  const { data: progressById } = useGoalsProgress(goalIds);

  const totalTarget = useMemo(
    () => (goals ?? []).reduce((sum, goal) => sum + goal.targetAmount, 0n),
    [goals],
  );

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
    <div className="flex flex-col gap-8">
      <section
        data-ocid="home.hero_section"
        className="surface-card relative overflow-hidden rounded-3xl p-6 md:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="label-eyebrow">Celengan pribadi</span>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">
              Wujudkan target tabunganmu,{" "}
              <span className="text-gradient-primary">satu setoran</span> setiap
              waktu.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Catat setiap setoran, pantau progres, dan lihat sisa hari menuju
              targetmu. Semua tersimpan otomatis di perangkat ini.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="rounded-full px-5"
                data-ocid="home.create_goal_button"
                onClick={() => {
                  setFormError(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Buat target baru
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full px-5"
                data-ocid="home.view_goals_button"
              >
                <Link to="/target">
                  Lihat semua target
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center">
            <ProgressRing
              percentage={featuredProgress?.percentage ?? 0}
              size={148}
            >
              <span className="font-figure text-2xl font-semibold text-foreground">
                {formatPercent(featuredProgress?.percentage ?? 0)}
              </span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {featured ? "target teratas" : "belum ada target"}
              </span>
            </ProgressRing>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile
          icon={PiggyBank}
          label="Jumlah target"
          value={isLoading ? "—" : `${goals?.length ?? 0}`}
          ocid="home.summary_goals"
        />
        <SummaryTile
          icon={Wallet}
          label="Total nominal target"
          value={isLoading ? "—" : formatRupiah(totalTarget)}
          ocid="home.summary_total"
        />
        <SummaryTile
          icon={Sparkles}
          label="Target teratas"
          value={featured ? featured.name : "Belum ada"}
          ocid="home.summary_featured"
          truncate
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="label-eyebrow">Target terbaru</span>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Sedang berjalan
            </h2>
          </div>
          {sortedGoals.length > 0 ? (
            <Link
              to="/target"
              data-ocid="home.see_all_link"
              className="text-sm font-medium text-primary transition-smooth hover:underline"
            >
              Semua target
            </Link>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => `home-skeleton-${i}`).map(
              (id) => (
                <Skeleton key={id} className="h-64 rounded-3xl" />
              ),
            )}
          </div>
        ) : sortedGoals.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Belum ada target tabungan"
            description="Mulai dengan membuat target pertamamu, unggah foto impianmu, dan tentukan tenggat waktunya."
            actionLabel="Buat target pertama"
            onAction={() => {
              setFormError(null);
              setFormOpen(true);
            }}
            ocid="home.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedGoals.slice(0, 3).map((goal, index) => (
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
      </section>

      {featured && featuredProgress ? (
        <section
          data-ocid="home.featured_section"
          className="surface-card flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between md:p-6"
        >
          <div className="min-w-0">
            <span className="label-eyebrow">Fokus saat ini</span>
            <h3 className="mt-1 truncate font-display text-lg font-semibold">
              {featured.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Terkumpul {formatRupiah(featuredProgress.totalDeposits)} dari{" "}
              {formatRupiah(featured.targetAmount)} · tenggat{" "}
              {formatShortDateText(featured.targetDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CountdownChip
              daysRemaining={Number(featuredProgress.daysRemaining)}
              isReached={featuredProgress.isReached}
              isOverdue={featuredProgress.isOverdue}
            />
            <Button
              asChild
              className="rounded-full px-5"
              data-ocid="home.open_featured_button"
            >
              <Link
                to="/target/$goalId"
                params={{ goalId: featured.id.toString() }}
              >
                Buka detail
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

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

interface SummaryTileProps {
  icon: typeof PiggyBank;
  label: string;
  value: string;
  ocid: string;
  truncate?: boolean;
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  ocid,
  truncate,
}: SummaryTileProps) {
  return (
    <div
      data-ocid={ocid}
      className="surface-card flex items-center gap-3 rounded-2xl p-4"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="label-eyebrow">{label}</p>
        <p
          className={cn(
            "mt-0.5 font-figure text-base font-semibold text-foreground",
            truncate && "truncate",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
