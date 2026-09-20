import { useAddDeposit, useUpdateDeposit } from "@/hooks/use-goals";
import { createMockActor, makeDeposit } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The hooks translate the backend's `SavingsError` variant into the Indonesian
// message the UI shows. This is the frontend/backend consumer seam: the actor
// is a typed local mock, so the test pins the mapping the app relies on.
const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

function AddDepositHarness() {
  const addDeposit = useAddDeposit();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          addDeposit.mutate(
            { goalId: 1n, amount: 500_000n, date: "2026-02-01" },
            { onError: () => {} },
          )
        }
      >
        add
      </button>
      <span data-ocid="harness.error">
        {addDeposit.error?.message ?? "none"}
      </span>
    </div>
  );
}

function UpdateDepositHarness() {
  const updateDeposit = useUpdateDeposit();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          updateDeposit.mutate(
            {
              input: { id: 1n, amount: 900_000n, date: "2026-02-01" },
              goalId: 1n,
            },
            { onError: () => {} },
          )
        }
      >
        update
      </button>
      <span data-ocid="harness.error">
        {updateDeposit.error?.message ?? "none"}
      </span>
    </div>
  );
}

function renderHarness(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAddDeposit error mapping", () => {
  it("surfaces the goal-not-found message from the backend variant", async () => {
    actor.addDeposit.mockResolvedValue({
      __kind__: "err",
      err: { __kind__: "goalNotFound", goalNotFound: 1n },
    });
    const user = userEvent.setup();
    renderHarness(<AddDepositHarness />);

    await user.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() =>
      expect(screen.getByTestId("harness.error")).toHaveTextContent(
        "Target tidak ditemukan.",
      ),
    );
  });

  it("surfaces the backend's invalid-input detail", async () => {
    actor.addDeposit.mockResolvedValue({
      __kind__: "err",
      err: { __kind__: "invalidInput", invalidInput: "Nominal harus positif." },
    });
    const user = userEvent.setup();
    renderHarness(<AddDepositHarness />);

    await user.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() =>
      expect(screen.getByTestId("harness.error")).toHaveTextContent(
        "Nominal harus positif.",
      ),
    );
  });

  it("returns the created deposit on success", async () => {
    actor.addDeposit.mockResolvedValue({
      __kind__: "ok",
      ok: makeDeposit({ id: 2n, goalId: 1n, amount: 500_000n }),
    });
    const user = userEvent.setup();
    renderHarness(<AddDepositHarness />);

    await user.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() =>
      expect(actor.addDeposit).toHaveBeenCalledWith(
        expect.objectContaining({ goalId: 1n, amount: 500_000n }),
      ),
    );
    expect(screen.getByTestId("harness.error")).toHaveTextContent("none");
  });
});

describe("useUpdateDeposit error mapping", () => {
  it("surfaces the deposit-not-found message from the backend variant", async () => {
    actor.updateDeposit.mockResolvedValue({
      __kind__: "err",
      err: { __kind__: "depositNotFound", depositNotFound: 1n },
    });
    const user = userEvent.setup();
    renderHarness(<UpdateDepositHarness />);

    await user.click(screen.getByRole("button", { name: "update" }));

    await waitFor(() =>
      expect(screen.getByTestId("harness.error")).toHaveTextContent(
        "Setoran tidak ditemukan.",
      ),
    );
  });
});
