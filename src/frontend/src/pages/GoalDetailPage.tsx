import { TrendPeriod } from "@/backend";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CountdownChip } from "@/components/CountdownChip";
import { EmptyState } from "@/components/EmptyState";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddDeposit,
  useDeleteDeposit,
  useDeleteGoal,
  useDeposits,
  useGoals,
  useProgress,
  useStats,
  useTrend,
  useUpdateDeposit,
} from "@/hooks/use-goals";
import {
  formatDateText,
  formatDecimal,
  formatMonthPeriod,
  formatPercent,
  formatRupiah,
  formatShortDateText,
  parseRupiahInput,
  todayDateText,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DepositView } from "@/types/savings";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  ImageOff,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Goal detail: photo, progress, countdown, stats, trend, and deposits. */
export function GoalDetailPage() {
  const { goalId } = useParams({ from: "/target/$goalId" });
  const navigate = useNavigate();
  const id = useMemo(() => {
    try {
      return BigInt(goalId);
    } catch {
      return null;
    }
  }, [goalId]);

  const { data: goals, isLoading: goalsLoading } = useGoals();
  const goal = useMemo(
    () => (goals ?? []).find((item) => item.id === id) ?? null,
    [goals, id],
  );

  const { data: progress } = useProgress(id);
  const { data: stats } = useStats(id);
  const { data: deposits, isLoading: depositsLoading } = useDeposits(id);
  const [trendMode, setTrendMode] = useState<TrendPeriod>(TrendPeriod.daily);
  const { data: trend } = useTrend(id, trendMode);

  const addDeposit = useAddDeposit();
  const updateDeposit = useUpdateDeposit();
  const deleteDeposit = useDeleteDeposit();
  const deleteGoal = useDeleteGoal();

  const [depositFormOpen, setDepositFormOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<DepositView | null>(
    null,
  );
  const [depositToDelete, setDepositToDelete] = useState<DepositView | null>(
    null,
  );
  const [goalDeleteOpen, setGoalDeleteOpen] = useState(false);

  const chartData = useMemo(
    () =>
      (trend ?? []).map((point) => ({
        label:
          trendMode === TrendPeriod.monthly
            ? formatMonthPeriod(point.period)
            : formatShortDateText(point.period),
        total: Number(point.total),
        count: Number(point.count),
      })),
    [trend, trendMode],
  );

  if (goalsLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!goal || id === null) {
    return (
      <EmptyState
        icon={Receipt}
        title="Target tidak ditemukan"
        description="Target yang kamu cari mungkin sudah dihapus. Kembali ke daftar target untuk melanjutkan."
        actionLabel="Lihat daftar target"
        onAction={() => void navigate({ to: "/target" })}
        ocid="goal_detail.empty_state"
      />
    );
  }

  const percentage = progress?.percentage ?? 0;
  const clamped = Math.max(0, Math.min(100, percentage));
  const totalDeposits = progress?.totalDeposits ?? 0n;
  const remaining = progress?.remaining ?? goal.targetAmount;
  const excess =
    totalDeposits > goal.targetAmount ? totalDeposits - goal.targetAmount : 0n;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/target"
        data-ocid="goal_detail.back_link"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-smooth hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua target
      </Link>

      <section
        data-ocid="goal_detail.hero_section"
        className="surface-card overflow-hidden rounded-3xl"
      >
        <div className="relative aspect-[16/9] w-full bg-muted md:aspect-[21/9]">
          {goal.photoUrl ? (
            <img
              src={goal.photoUrl}
              alt={`Foto target ${goal.name}`}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-8" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-semibold text-white drop-shadow md:text-3xl">
                {goal.name}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                {formatDateText(goal.startDate)} —{" "}
                {formatDateText(goal.targetDate)}
              </p>
            </div>
            {progress ? (
              <CountdownChip
                daysRemaining={Number(progress.daysRemaining)}
                isReached={progress.isReached}
                isOverdue={progress.isOverdue}
                className="backdrop-blur"
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-5">
            <ProgressRing percentage={percentage} size={124}>
              <span className="font-figure text-xl font-semibold">
                {formatPercent(percentage)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                tercapai
              </span>
            </ProgressRing>
            <div className="flex flex-col gap-1">
              <span className="label-eyebrow">Terkumpul</span>
              <span className="font-figure text-2xl font-semibold text-foreground">
                {formatRupiah(totalDeposits)}
              </span>
              <span className="text-sm text-muted-foreground">
                dari {formatRupiah(goal.targetAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full px-5"
                data-ocid="goal_detail.add_deposit_button"
                onClick={() => {
                  setEditingDeposit(null);
                  setDepositFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Tambah setoran
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5 text-destructive hover:text-destructive"
                data-ocid="goal_detail.delete_goal_button"
                onClick={() => setGoalDeleteOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Hapus target
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {progress?.isReached
                ? "Target sudah tercapai. Setoran tambahan tetap tercatat."
                : `Sisa ${formatRupiah(remaining)} lagi`}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-muted"
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
                clamped >= 100 && "glow-primary",
              )}
              style={{ width: `${clamped}%` }}
            />
          </div>
          {excess > 0n ? (
            <p
              data-ocid="goal_detail.excess_note"
              className="mt-2 text-xs font-medium text-accent"
            >
              Kelebihan {formatRupiah(excess)} di atas target tetap tercatat.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Wallet}
          label="Total setoran"
          value={formatRupiah(stats?.totalDeposits ?? totalDeposits)}
          ocid="goal_detail.stat_total"
        />
        <StatTile
          icon={Receipt}
          label="Jumlah setoran"
          value={`${Number(stats?.depositCount ?? 0n)} kali`}
          ocid="goal_detail.stat_count"
        />
        <StatTile
          icon={TrendingUp}
          label="Rata-rata setoran"
          value={formatRupiah(stats?.averageDeposit ?? 0)}
          ocid="goal_detail.stat_average"
        />
        <StatTile
          icon={CalendarDays}
          label="Sisa target"
          value={formatRupiah(stats?.remaining ?? remaining)}
          ocid="goal_detail.stat_remaining"
        />
      </section>

      <section
        data-ocid="goal_detail.trend_section"
        className="surface-card flex flex-col gap-4 rounded-3xl p-5 md:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="label-eyebrow">Tren setoran</span>
            <h2 className="mt-1 font-display text-lg font-semibold">
              Pola menabung
            </h2>
          </div>
          <div
            role="tablist"
            aria-label="Periode tren"
            className="inline-flex rounded-full bg-muted p-1"
          >
            <TrendTab
              active={trendMode === TrendPeriod.daily}
              label="Per hari"
              ocid="goal_detail.trend.tab.daily"
              onClick={() => setTrendMode(TrendPeriod.daily)}
            />
            <TrendTab
              active={trendMode === TrendPeriod.monthly}
              label="Per bulan"
              ocid="goal_detail.trend.tab.monthly"
              onClick={() => setTrendMode(TrendPeriod.monthly)}
            />
          </div>
        </div>

        {chartData.length === 0 ? (
          <p
            data-ocid="goal_detail.trend.empty_state"
            className="py-10 text-center text-sm text-muted-foreground"
          >
            Belum ada setoran untuk ditampilkan pada grafik.
          </p>
        ) : (
          <div className="h-64 w-full" data-ocid="goal_detail.trend.chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="oklch(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "oklch(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{
                    fill: "oklch(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  tickFormatter={(value: number) =>
                    `${formatDecimal(value / 1000)}rb`
                  }
                />
                <Tooltip
                  cursor={{ fill: "oklch(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "oklch(var(--popover))",
                    border: "1px solid oklch(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value: number) => [formatRupiah(value), "Total"]}
                />
                <Bar
                  dataKey="total"
                  fill="oklch(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="label-eyebrow">Riwayat</span>
            <h2 className="mt-1 font-display text-lg font-semibold">
              Setoran terbaru
            </h2>
          </div>
          <span className="font-figure text-sm text-muted-foreground">
            {formatRupiah(totalDeposits)}
          </span>
        </div>

        {depositsLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => `deposit-skeleton-${i}`).map(
              (key) => (
                <Skeleton key={key} className="h-20 rounded-2xl" />
              ),
            )}
          </div>
        ) : (deposits ?? []).length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada setoran"
            description="Catat setoran pertamamu untuk mulai menggerakkan progress target ini."
            actionLabel="Tambah setoran"
            onAction={() => {
              setEditingDeposit(null);
              setDepositFormOpen(true);
            }}
            ocid="goal_detail.deposits.empty_state"
          />
        ) : (
          <ul
            data-ocid="goal_detail.deposits.list"
            className="flex flex-col gap-3"
          >
            {(deposits ?? []).map((deposit, index) => (
              <li
                key={deposit.id.toString()}
                data-ocid={`goal_detail.deposit.item.${index + 1}`}
                className="surface-card flex items-center justify-between gap-4 rounded-2xl p-4"
              >
                <div className="min-w-0">
                  <p className="font-figure text-base font-semibold text-foreground">
                    {formatRupiah(deposit.amount)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateText(deposit.date)}
                  </p>
                  {deposit.note ? (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {deposit.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit setoran ${formatRupiah(deposit.amount)}`}
                    data-ocid={`goal_detail.deposit.edit_button.${index + 1}`}
                    onClick={() => {
                      setEditingDeposit(deposit);
                      setDepositFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus setoran ${formatRupiah(deposit.amount)}`}
                    data-ocid={`goal_detail.deposit.delete_button.${index + 1}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDepositToDelete(deposit)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DepositFormDialog
        open={depositFormOpen}
        onOpenChange={(open) => {
          setDepositFormOpen(open);
          if (!open) setEditingDeposit(null);
        }}
        deposit={editingDeposit}
        isPending={addDeposit.isPending || updateDeposit.isPending}
        onSubmit={(values) => {
          if (editingDeposit) {
            updateDeposit.mutate(
              {
                input: {
                  id: editingDeposit.id,
                  amount: values.amount,
                  date: values.date,
                  note: values.note || undefined,
                },
                goalId: goal.id,
              },
              {
                onSuccess: () => {
                  setDepositFormOpen(false);
                  setEditingDeposit(null);
                },
              },
            );
          } else {
            addDeposit.mutate(
              {
                goalId: goal.id,
                amount: values.amount,
                date: values.date,
                note: values.note || undefined,
              },
              {
                onSuccess: () => {
                  setDepositFormOpen(false);
                },
              },
            );
          }
        }}
      />

      <ConfirmDialog
        open={depositToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDepositToDelete(null);
        }}
        title="Hapus setoran ini?"
        description={
          depositToDelete
            ? `Setoran ${formatRupiah(depositToDelete.amount)} pada ${formatDateText(
                depositToDelete.date,
              )} akan dihapus permanen.`
            : ""
        }
        isPending={deleteDeposit.isPending}
        ocid="deposit_delete"
        onConfirm={() => {
          if (!depositToDelete) return;
          deleteDeposit.mutate(
            { id: depositToDelete.id, goalId: goal.id },
            { onSuccess: () => setDepositToDelete(null) },
          );
        }}
      />

      <ConfirmDialog
        open={goalDeleteOpen}
        onOpenChange={setGoalDeleteOpen}
        title="Hapus target ini?"
        description={`Target "${goal.name}" beserta seluruh setorannya akan dihapus permanen.`}
        isPending={deleteGoal.isPending}
        ocid="goal_delete"
        onConfirm={() => {
          deleteGoal.mutate(goal.id, {
            onSuccess: () => void navigate({ to: "/target" }),
          });
        }}
      />
    </div>
  );
}

interface StatTileProps {
  icon: typeof Wallet;
  label: string;
  value: string;
  ocid: string;
}

function StatTile({ icon: Icon, label, value, ocid }: StatTileProps) {
  return (
    <div
      data-ocid={ocid}
      className="surface-card flex flex-col gap-2 rounded-2xl p-4"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="label-eyebrow">{label}</span>
      <span className="font-figure text-base font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

interface TrendTabProps {
  active: boolean;
  label: string;
  ocid: string;
  onClick: () => void;
}

function TrendTab({ active, label, ocid, onClick }: TrendTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-ocid={ocid}
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-smooth",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

interface DepositFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit: DepositView | null;
  isPending: boolean;
  onSubmit: (values: { amount: bigint; date: string; note: string }) => void;
}

function DepositFormDialog({
  open,
  onOpenChange,
  deposit,
  isPending,
  onSubmit,
}: DepositFormDialogProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const formKey = open ? (deposit ? deposit.id.toString() : "new") : null;

  if (open && formKey !== initializedFor) {
    setInitializedFor(formKey);
    setAmount(deposit ? deposit.amount.toString() : "");
    setDate(deposit ? deposit.date : todayDateText());
    setNote(deposit?.note ?? "");
    setError(null);
  }
  if (!open && initializedFor !== null) {
    setInitializedFor(null);
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseRupiahInput(amount);
    if (parsed === null || parsed <= 0n) {
      setError("Nominal setoran harus lebih dari Rp0.");
      return;
    }
    if (!date) {
      setError("Tanggal setoran wajib diisi.");
      return;
    }
    setError(null);
    onSubmit({ amount: parsed, date, note: note.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="deposit_form.dialog"
        className="surface-card rounded-3xl border-border sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {deposit ? "Edit Setoran" : "Tambah Setoran"}
          </DialogTitle>
          <DialogDescription>
            Catat nominal dan tanggal setoran. Catatan bersifat opsional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="deposit-amount">Nominal (Rp)</Label>
            <Input
              id="deposit-amount"
              data-ocid="deposit_form.amount_input"
              inputMode="numeric"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="500000"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deposit-date">Tanggal setoran</Label>
            <Input
              id="deposit-date"
              data-ocid="deposit_form.date_input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deposit-note">Catatan (opsional)</Label>
            <Textarea
              id="deposit-note"
              data-ocid="deposit_form.note_input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Contoh: bonus bulanan"
              rows={3}
            />
          </div>

          {error ? (
            <p
              data-ocid="deposit_form.error_state"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              data-ocid="deposit_form.cancel_button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="rounded-full px-5"
              data-ocid="deposit_form.submit_button"
              disabled={isPending}
            >
              {isPending
                ? "Menyimpan…"
                : deposit
                  ? "Simpan perubahan"
                  : "Tambah setoran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
