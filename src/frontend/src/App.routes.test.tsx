import { coreInfrastructureMock, signedOutIdentity } from "@/test/auth-mock";
import { createMockActor, makeGoal, makeProgress } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The savings baseline the music feature must not disturb: each of the four
// existing paths must still mount its page through the real router. `App.tsx`
// builds its router at module scope against browser history, so each case
// resets the module registry, points `window.location` at the path, and then
// imports the app fresh. The actor is a typed local mock; no canister is
// contacted.
const actor = createMockActor();
const identity = signedOutIdentity();

vi.mock("@caffeineai/core-infrastructure", () =>
  coreInfrastructureMock(actor, identity),
);

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return import("@/App").then(({ default: App }) =>
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    ),
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  actor.listGoals.mockResolvedValue([]);
  actor.getProgress.mockResolvedValue(null);
  actor.getStats.mockResolvedValue(null);
  actor.listDeposits.mockResolvedValue([]);
  actor.getTrend.mockResolvedValue([]);
});

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("App route rendering", () => {
  it("renders the dashboard at /", async () => {
    await renderAt("/");

    expect(
      await screen.findByRole("heading", {
        name: /Wujudkan target tabunganmu/,
      }),
    ).toBeInTheDocument();
  });

  it("renders the goals list at /target", async () => {
    await renderAt("/target");

    expect(
      await screen.findByRole("heading", { name: "Target Tabungan" }),
    ).toBeInTheDocument();
  });

  it("renders the goal detail at /target/$goalId", async () => {
    actor.listGoals.mockResolvedValue([
      makeGoal({ id: 1n, name: "Liburan", targetAmount: 10_000_000n }),
    ]);
    actor.getProgress.mockResolvedValue(
      makeProgress({ goalId: 1n, totalDeposits: 2_500_000n, percentage: 25 }),
    );

    await renderAt("/target/1");

    expect(
      await screen.findByRole("heading", { name: "Liburan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders the settings page at /pengaturan", async () => {
    await renderAt("/pengaturan");

    expect(
      await screen.findByRole("heading", { name: "Tampilan Aplikasi" }),
    ).toBeInTheDocument();
  });
});
