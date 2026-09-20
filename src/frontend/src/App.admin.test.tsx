import { createMockActor } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The /admin route guard is the permission seam: a signed-out visitor and a
// signed-in non-admin must both see the access-denied panel, and only an admin
// may reach the reminder page. `useAuth` is mocked directly so each case can
// pin the exact auth state the guard branches on; the actor is a typed local
// mock and no canister is contacted.
const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isInitializing: false,
  isAdmin: false,
  isRoleLoading: false,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
    isInitializing: authState.isInitializing,
    isAdmin: authState.isAdmin,
    isRoleLoading: authState.isRoleLoading,
    principal: null,
    principalText: null,
    role: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// The Musik page's search adapter is an external network dependency; the route
// guard is what is under test, so it is replaced with a local stub.
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
  authState.isAuthenticated = false;
  authState.isInitializing = false;
  authState.isAdmin = false;
  authState.isRoleLoading = false;
  actor.getReminderSettings.mockResolvedValue({
    phoneNumber: "",
    senderNumber: "",
    enabled: false,
    accountSidSet: false,
    apiKeySidSet: false,
    apiKeySecretSet: false,
    accountSidMasked: "",
    apiKeySidMasked: "",
  });
  actor.isReminderConfigured.mockResolvedValue(false);
  actor.getLastReminderSend.mockResolvedValue(null);
});

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("admin route guard", () => {
  it("denies a signed-out visitor and offers a way back home", async () => {
    await renderAt("/admin");

    expect(
      await screen.findByTestId("admin.access_denied_state"),
    ).toBeInTheDocument();
    expect(screen.getByText("Akses ditolak")).toBeInTheDocument();
    expect(screen.getByTestId("admin.back_home_link")).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByTestId("admin.send_now_button"),
    ).not.toBeInTheDocument();
  });

  it("denies a signed-in non-admin", async () => {
    authState.isAuthenticated = true;
    authState.isAdmin = false;
    await renderAt("/admin");

    expect(
      await screen.findByTestId("admin.access_denied_state"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin.send_now_button"),
    ).not.toBeInTheDocument();
  });

  it("admits an admin to the reminder page", async () => {
    authState.isAuthenticated = true;
    authState.isAdmin = true;
    await renderAt("/admin");

    expect(
      await screen.findByRole("heading", { name: "Pengingat Setoran" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("admin.send_now_button")).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin.access_denied_state"),
    ).not.toBeInTheDocument();
  });
});
