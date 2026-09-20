import { TrendPeriod } from "@/backend";
import { GoalDetailPage } from "@/pages/GoalDetailPage";
import {
  createMockActor,
  makeDeposit,
  makeGoal,
  makeProgress,
  makeStats,
} from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ goalId: "1" }),
  useNavigate: () => navigate,
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GoalDetailPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  actor.listGoals.mockResolvedValue([
    makeGoal({ id: 1n, name: "Liburan", targetAmount: 10_000_000n }),
  ]);
  actor.getProgress.mockResolvedValue(
    makeProgress({ goalId: 1n, totalDeposits: 2_500_000n, percentage: 25 }),
  );
  actor.getStats.mockResolvedValue(makeStats({ goalId: 1n }));
  actor.listDeposits.mockResolvedValue([makeDeposit({ id: 1n, goalId: 1n })]);
  actor.getTrend.mockResolvedValue([]);
});

describe("GoalDetailPage", () => {
  it("shows the photo, progress, remaining, and countdown", async () => {
    renderPage();

    expect(
      await screen.findByRole("img", { name: "Foto target Liburan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText(/Sisa\sRp\s7\.500\.000\slagi/)).toBeInTheDocument();
    expect(screen.getByText("30 hari lagi")).toBeInTheDocument();
  });

  it("clamps the bar at 100% and surfaces the excess when over target", async () => {
    actor.getProgress.mockResolvedValue(
      makeProgress({
        goalId: 1n,
        totalDeposits: 12_000_000n,
        percentage: 100,
        isReached: true,
        remaining: 0n,
      }),
    );
    actor.getStats.mockResolvedValue(
      makeStats({ goalId: 1n, totalDeposits: 12_000_000n, remaining: 0n }),
    );

    renderPage();

    const bar = await screen.findByRole("progressbar", {
      name: "Progres Liburan",
    });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.getByText(
        /Kelebihan\sRp\s2\.000\.000\sdi atas target tetap tercatat\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Target sudah tercapai. Setoran tambahan tetap tercatat.",
      ),
    ).toBeInTheDocument();
  });

  it("adds a deposit through the form and calls the actor", async () => {
    actor.addDeposit.mockResolvedValue({
      __kind__: "ok",
      ok: makeDeposit({ id: 2n, goalId: 1n, amount: 500_000n }),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Tambah setoran" }),
    );
    await user.type(screen.getByLabelText("Nominal (Rp)"), "500000");
    await user.click(screen.getByRole("button", { name: "Tambah setoran" }));

    await waitFor(() =>
      expect(actor.addDeposit).toHaveBeenCalledWith(
        expect.objectContaining({ goalId: 1n, amount: 500_000n }),
      ),
    );
  });

  it("edits an existing deposit through the form", async () => {
    actor.updateDeposit.mockResolvedValue({
      __kind__: "ok",
      ok: makeDeposit({ id: 1n, goalId: 1n, amount: 900_000n }),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: /Edit setoran Rp\s1\.500\.000/,
      }),
    );
    const amount = screen.getByLabelText("Nominal (Rp)");
    await user.clear(amount);
    await user.type(amount, "900000");
    await user.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() =>
      expect(actor.updateDeposit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1n, amount: 900_000n }),
      ),
    );
  });

  it("requires confirmation before deleting a deposit", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: /Hapus setoran Rp\s1\.500\.000/,
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Hapus setoran ini?")).toBeInTheDocument();
    expect(actor.deleteDeposit).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(actor.deleteDeposit).toHaveBeenCalledWith(1n));
  });

  it("requires confirmation before deleting the goal, then navigates away", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Hapus target" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Hapus target ini?")).toBeInTheDocument();
    expect(actor.deleteGoal).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(actor.deleteGoal).toHaveBeenCalledWith(1n));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/target" }),
    );
  });

  it("switches the trend period between daily and monthly", async () => {
    actor.getTrend.mockResolvedValue([
      { period: "2026-02-01", total: 1_500_000n, count: 1n },
    ]);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Pola menabung");
    await user.click(screen.getByRole("tab", { name: "Per bulan" }));

    await waitFor(() =>
      expect(actor.getTrend).toHaveBeenCalledWith(1n, TrendPeriod.monthly),
    );
  });
});
