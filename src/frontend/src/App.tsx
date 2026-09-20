import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { BackgroundProvider, useBackground } from "@/hooks/use-background";
import { MusicPlayerProvider } from "@/hooks/use-music-player";
import { AdminPage } from "@/pages/AdminPage";
import { GoalDetailPage } from "@/pages/GoalDetailPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { HomePage } from "@/pages/HomePage";
import { MusikPage } from "@/pages/MusikPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SettingsPage } from "@/pages/SettingsPage";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  const { background } = useBackground();
  return (
    <AppShell background={background}>
      <Outlet />
    </AppShell>
  );
}

/** Indonesian access-denied panel shown to signed-out or non-admin callers. */
function AdminAccessDenied() {
  return (
    <section
      data-ocid="admin.access_denied_state"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-2xl font-semibold">Akses ditolak</h1>
      <p className="text-sm text-muted-foreground">
        Halaman ini hanya dapat diakses oleh admin. Masuk dengan akun admin
        untuk melanjutkan.
      </p>
      <Link
        to="/"
        data-ocid="admin.back_home_link"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Kembali ke Beranda
      </Link>
    </section>
  );
}

/** Route guard: renders the admin page only for admins. */
function AdminRoute() {
  const { isAuthenticated, isInitializing, isAdmin, isRoleLoading } = useAuth();

  if (isInitializing || (isAuthenticated && isRoleLoading)) {
    return (
      <div
        data-ocid="admin.loading_state"
        className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground"
      >
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        Memeriksa akses…
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <AdminAccessDenied />;
  }

  return <AdminPage />;
}

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/target",
  component: GoalsPage,
});

const goalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/target/$goalId",
  component: GoalDetailPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pengaturan",
  component: SettingsPage,
});

const musikRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/musik",
  component: MusikPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminRoute,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  goalsRoute,
  goalDetailRoute,
  musikRoute,
  settingsRoute,
  adminRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <BackgroundProvider>
      <MusicPlayerProvider>
        <RouterProvider router={router} />
      </MusicPlayerProvider>
    </BackgroundProvider>
  );
}
