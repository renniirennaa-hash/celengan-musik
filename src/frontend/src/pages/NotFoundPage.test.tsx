import { NotFoundPage } from "@/pages/NotFoundPage";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: { children: ReactNode; to: string } & Record<string, unknown>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("NotFoundPage", () => {
  it("explains the missing page and links back to the dashboard", () => {
    render(<NotFoundPage />);

    expect(
      screen.getByRole("heading", { name: "Halaman tidak ditemukan" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kembali ke beranda" }),
    ).toHaveAttribute("href", "/");
  });
});
