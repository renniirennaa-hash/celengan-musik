import { GoalsPage } from "@/pages/GoalsPage";
import { createMockActor, makeGoal, makeProgress } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
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
      <GoalsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  actor.listGoals.mockResolvedValue([]);
  actor.getProgress.mockResolvedValue(null);
});

describe("GoalsPage", () => {
  it("shows the empty state when there are no goals", async () => {
    renderPage();
    expect(
      await screen.findByText("Belum ada target tabungan"),
    ).toBeInTheDocument();
  });

  it("renders a card per goal with its progress", async () => {
    actor.listGoals.mockResolvedValue([
      makeGoal({ id: 1n, name: "Liburan", targetAmount: 10_000_000n }),
    ]);
    actor.getProgress.mockResolvedValue(
      makeProgress({ goalId: 1n, totalDeposits: 2_500_000n, percentage: 25 }),
    );

    renderPage();

    expect(await screen.findByText("Liburan")).toBeInTheDocument();
    expect(await screen.findByText(/Rp\s2\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("opens the detail route after creating a goal", async () => {
    actor.createGoal.mockResolvedValue(makeGoal({ id: 42n, name: "Baru" }));
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Buat target pertama" }),
    );
    await user.type(screen.getByLabelText("Nama target"), "Baru");
    await user.type(screen.getByLabelText("Nominal target (Rp)"), "5000000");
    await user.clear(screen.getByLabelText("Tanggal mulai"));
    await user.type(screen.getByLabelText("Tanggal mulai"), "2026-01-01");
    await user.type(screen.getByLabelText("Tanggal tujuan"), "2026-12-31");
    await user.upload(
      screen.getByLabelText("Foto target (wajib)"),
      new File(["x"], "p.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Simpan target" }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/target/$goalId",
        params: { goalId: "42" },
      }),
    );
    expect(actor.createGoal).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Baru", targetAmount: 5_000_000n }),
    );
  });
});
