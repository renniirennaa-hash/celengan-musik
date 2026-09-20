import { HomePage } from "@/pages/HomePage";
import { createMockActor, makeGoal, makeProgress } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
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
      <HomePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  actor.listGoals.mockResolvedValue([]);
  actor.getProgress.mockResolvedValue(null);
});

describe("HomePage", () => {
  it("renders the dashboard shell and empty state on the default route", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /Wujudkan target tabunganmu/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Belum ada target tabungan"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("home.summary_goals")).toHaveTextContent("0");
  });

  it("summarizes goals and shows the featured goal with its countdown", async () => {
    actor.listGoals.mockResolvedValue([
      makeGoal({ id: 1n, name: "Liburan", targetAmount: 10_000_000n }),
    ]);
    actor.getProgress.mockResolvedValue(
      makeProgress({
        goalId: 1n,
        totalDeposits: 2_500_000n,
        percentage: 25,
        daysRemaining: 30n,
      }),
    );

    renderPage();

    expect((await screen.findAllByText("Liburan")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("home.summary_goals")).toHaveTextContent("1");
    expect(screen.getByTestId("home.summary_total")).toHaveTextContent(
      /Rp\s10\.000\.000/,
    );
    const featured = await screen.findByTestId("home.featured_section");
    expect(featured).toBeInTheDocument();
    expect(within(featured).getByText("30 hari lagi")).toBeInTheDocument();
  });
});
