import { CountdownChip } from "@/components/CountdownChip";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("CountdownChip", () => {
  it("shows the remaining days for an active goal", () => {
    render(
      <CountdownChip daysRemaining={12} isReached={false} isOverdue={false} />,
    );
    expect(screen.getByText("12 hari lagi")).toBeInTheDocument();
  });

  it("shows a reached indicator once the target is met", () => {
    render(
      <CountdownChip daysRemaining={-4} isReached={true} isOverdue={false} />,
    );
    expect(screen.getByText("Target tercapai")).toBeInTheDocument();
  });

  it("shows an overdue indicator when the target date has passed unmet", () => {
    render(
      <CountdownChip daysRemaining={-4} isReached={false} isOverdue={true} />,
    );
    expect(screen.getByText("Lewat 4 hari")).toBeInTheDocument();
  });
});
