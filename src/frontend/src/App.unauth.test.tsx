import { coreInfrastructureMock, signedOutIdentity } from "@/test/auth-mock";
import { createMockActor } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Characterization baseline for the Internet Identity change: the existing
// Celengan Musik features must stay usable by a visitor who has NOT logged in.
// This file deliberately installs no auth provider and no identity mock, so it
// fails if the app ever gates the existing routes behind a sign-in wall.
//
// `App.tsx` builds its router at module scope against browser history, so each
// case resets the module registry, points `window.location` at the path, and
// imports the app fresh. The actor is a typed local mock; no canister is
// contacted.
const actor = createMockActor();
const identity = signedOutIdentity();

vi.mock("@caffeineai/core-infrastructure", () =>
  coreInfrastructureMock(actor, identity),
);

// The Musik page's search adapter is an external network dependency; the page's
// own contract is what is under test, so it is replaced with a local stub.
vi.mock("@/lib/archive", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/archive")>();
  return { ...actual, searchArchive: vi.fn(async () => []) };
});

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
  actor.listTracks.mockResolvedValue([]);
});

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("unauthenticated access to existing features", () => {
  it("renders the Musik tab through the real router without a login", async () => {
    await renderAt("/musik");

    expect(
      await screen.findByRole("heading", { name: "Cari Musik" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Musik Saya" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Kata kunci pencarian musik"),
    ).toBeInTheDocument();
  });

  it("keeps the four existing destinations in the shell nav without a login", async () => {
    await renderAt("/musik");

    const topNav = await screen.findByRole("navigation", {
      name: "Navigasi utama",
    });
    expect(
      within(topNav).getByRole("link", { name: "Beranda" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(topNav).getByRole("link", { name: "Target" }),
    ).toHaveAttribute("href", "/target");
    expect(within(topNav).getByRole("link", { name: "Musik" })).toHaveAttribute(
      "href",
      "/musik",
    );
    expect(
      within(topNav).getByRole("link", { name: "Pengaturan" }),
    ).toHaveAttribute("href", "/pengaturan");
  });

  it("renders the default route without a login wall", async () => {
    await renderAt("/");

    expect(
      await screen.findByRole("heading", {
        name: /Wujudkan target tabunganmu/,
      }),
    ).toBeInTheDocument();
    // The accepted login requirement adds a sign-in affordance to the shell,
    // but it must not stand between a visitor and the dashboard: the content
    // above is already rendered, and the button is an offer, not a gate.
    expect(
      screen.getByRole("button", { name: /masuk dengan internet identity/i }),
    ).toBeInTheDocument();
  });
});
