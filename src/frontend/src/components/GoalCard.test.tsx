import { GoalCard } from "@/components/GoalCard";
import { makeGoal, makeProgress } from "@/test/fixtures";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("GoalCard", () => {
  it("shows the photo, name, formatted amounts, and percentage", () => {
    render(
      <GoalCard
        goal={makeGoal({ name: "Liburan", targetAmount: 10_000_000n })}
        progress={makeProgress({ totalDeposits: 2_500_000n, percentage: 25 })}
        index={0}
        onOpen={() => {}}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Foto target Liburan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Liburan")).toBeInTheDocument();
    expect(screen.getByText(/Rp\s2\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/dari\sRp\s10\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("clamps the progress bar at 100% when deposits exceed the target", () => {
    render(
      <GoalCard
        goal={makeGoal({ targetAmount: 1_000_000n })}
        progress={makeProgress({
          totalDeposits: 1_500_000n,
          percentage: 100,
          isReached: true,
          remaining: 0n,
        })}
        index={0}
        onOpen={() => {}}
      />,
    );

    const bar = screen.getByRole("progressbar", {
      name: "Progres Liburan ke Jepang",
    });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Target tercapai")).toBeInTheDocument();
  });

  it("invokes onOpen with the goal id when clicked", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <GoalCard
        goal={makeGoal({ id: 7n })}
        progress={makeProgress()}
        index={0}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Liburan ke Jepang/ }));
    expect(onOpen).toHaveBeenCalledWith(7n);
  });
});
