import { AppShell } from "@/components/AppShell";
import { MusicPlayerProvider } from "@/hooks/use-music-player";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The shell reads the current pathname to mark the active nav item. Mocking the
// router keeps this a focused shell test: no router boot, no route components.
let pathname = "/";
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname } }),
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

// The shell now reads the caller's role to decide whether to show the Admin
// destination, so it consumes both `useActor` and `useInternetIdentity`.
// `vi.hoisted` keeps the mutable state reachable from the hoisted factory.
const { actor, identity } = vi.hoisted(() => {
  const actor = {
    isCallerAdmin: vi.fn(async () => false),
    getCallerUserRole: vi.fn(async () => "guest"),
    _initialize_access_control: vi.fn(async () => undefined),
  };
  const identity = {
    identity: null as null | {
      getPrincipal: () => { toText: () => string };
    },
    isAuthenticated: false,
    isInitializing: false,
    login: vi.fn(),
    clear: vi.fn(),
  };
  return { actor, identity };
});

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
  useInternetIdentity: () => identity,
}));

// The shell now mounts the persistent mini/full player, which read the shared
// music-player context, and reads the caller's role through `useAuth`, which
// needs a query client. Wrapping in the real providers keeps this a shell test
// while exercising the same providers the app installs above the router.
function renderShell(background: string | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MusicPlayerProvider>
        <AppShell background={background}>
          <p>Konten halaman</p>
        </AppShell>
      </MusicPlayerProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  pathname = "/";
  vi.clearAllMocks();
  // Default to a signed-out visitor; individual cases opt into a caller.
  identity.identity = null;
  identity.isAuthenticated = false;
  identity.isInitializing = false;
  actor.isCallerAdmin.mockResolvedValue(false);
  actor.getCallerUserRole.mockResolvedValue("guest");
});

describe("AppShell", () => {
  it("renders the brand, the four primary nav destinations, and the page content", () => {
    renderShell();

    expect(screen.getByText("Celengan")).toBeInTheDocument();
    expect(screen.getByText("Konten halaman")).toBeInTheDocument();

    const topNav = screen.getByRole("navigation", { name: "Navigasi utama" });
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

  it("exposes the same destinations in the mobile bottom nav", () => {
    renderShell();

    const bottomNav = screen.getByRole("navigation", {
      name: "Navigasi bawah",
    });
    expect(
      within(bottomNav).getByRole("link", { name: "Beranda" }),
    ).toBeInTheDocument();
    expect(
      within(bottomNav).getByRole("link", { name: "Target" }),
    ).toBeInTheDocument();
    expect(
      within(bottomNav).getByRole("link", { name: "Musik" }),
    ).toHaveAttribute("href", "/musik");
    expect(
      within(bottomNav).getByRole("link", { name: "Pengaturan" }),
    ).toBeInTheDocument();
  });

  it("marks the Musik destination active on the /musik path", () => {
    pathname = "/musik";
    renderShell();

    const topNav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(within(topNav).getByRole("link", { name: "Musik" })).toHaveClass(
      "text-primary",
    );
    expect(
      within(topNav).getByRole("link", { name: "Beranda" }),
    ).not.toHaveClass("text-primary");
  });

  it("marks the matching destination active for the current path", () => {
    pathname = "/target";
    renderShell();

    const topNav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(within(topNav).getByRole("link", { name: "Target" })).toHaveClass(
      "text-primary",
    );
    expect(
      within(topNav).getByRole("link", { name: "Beranda" }),
    ).not.toHaveClass("text-primary");
  });

  it("keeps the goals destination active on a nested goal detail path", () => {
    pathname = "/target/42";
    renderShell();

    const topNav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(within(topNav).getByRole("link", { name: "Target" })).toHaveClass(
      "text-primary",
    );
  });

  it("applies the uploaded background image to the shell", () => {
    const { container } = renderShell("data:image/png;base64,AAAA");

    const shell = container.querySelector(".app-shell-bg");
    expect(shell).not.toBeNull();
    expect(shell).toHaveStyle({
      backgroundImage: "url(data:image/png;base64,AAAA)",
    });
  });

  it("leaves the shell background unset when no image is stored", () => {
    const { container } = renderShell(null);

    const shell = container.querySelector(".app-shell-bg");
    expect(shell).not.toBeNull();
    expect(shell?.getAttribute("style") ?? "").not.toContain(
      "background-image",
    );
  });

  it("hides the Admin destination from a signed-out visitor", () => {
    renderShell();

    const topNav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(
      within(topNav).queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
    const bottomNav = screen.getByRole("navigation", {
      name: "Navigasi bawah",
    });
    expect(
      within(bottomNav).queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });

  it("hides the Admin destination from a signed-in non-admin", async () => {
    identity.identity = {
      getPrincipal: () => ({ toText: () => "aaaaa-aa" }),
    };
    identity.isAuthenticated = true;
    actor.isCallerAdmin.mockResolvedValue(false);
    renderShell();

    const topNav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(
      within(topNav).queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Admin destination to an admin", async () => {
    identity.identity = {
      getPrincipal: () => ({ toText: () => "aaaaa-aa" }),
    };
    identity.isAuthenticated = true;
    actor.isCallerAdmin.mockResolvedValue(true);
    renderShell();

    const topNav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(
      await within(topNav).findByRole("link", { name: "Admin" }),
    ).toHaveAttribute("href", "/admin");
    const bottomNav = screen.getByRole("navigation", {
      name: "Navigasi bawah",
    });
    expect(
      within(bottomNav).getByRole("link", { name: "Admin" }),
    ).toHaveAttribute("href", "/admin");
  });
});
