import { describe, expect, it, vi } from "vitest";

// `App.tsx` builds its route tree at module scope and hands it to
// `createRouter`. Capturing that tree is the only way to assert the app's
// registered routes without booting a real router, and it is exactly the
// contract the acceptance criteria name: the four existing paths must stay
// registered. The page components themselves are covered by their own tests.
const captured = vi.hoisted(() => ({ routeTree: undefined as unknown }));

vi.mock("@tanstack/react-router", () => ({
  createRootRoute: (options: unknown) => ({
    kind: "root",
    options,
    children: [] as unknown[],
    addChildren(children: unknown[]) {
      this.children = children;
      return this;
    },
  }),
  createRoute: (options: { path: string }) => ({ kind: "route", options }),
  createRouter: (options: { routeTree: unknown }) => {
    captured.routeTree = options.routeTree;
    return { options };
  },
  RouterProvider: () => null,
  Outlet: () => null,
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/hooks/use-background", () => ({
  BackgroundProvider: ({ children }: { children: unknown }) => children,
  useBackground: () => ({ background: null }),
}));

import App from "@/App";

interface CapturedRoute {
  options: { path: string };
}

function registeredPaths(): string[] {
  const tree = captured.routeTree as {
    children: CapturedRoute[];
  };
  return tree.children.map((route) => route.options.path);
}

describe("App route registration", () => {
  it("registers the existing savings and settings routes", () => {
    // Rendering the app is what executes the module-scope router construction.
    App();

    expect(registeredPaths()).toEqual(
      expect.arrayContaining([
        "/",
        "/target",
        "/target/$goalId",
        "/pengaturan",
      ]),
    );
  });
});
