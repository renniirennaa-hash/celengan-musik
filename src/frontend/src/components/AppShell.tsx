import { FullPlayer } from "@/components/FullPlayer";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  LogIn,
  LogOut,
  Music,
  PiggyBank,
  Settings,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  ocid: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Beranda", icon: Home, ocid: "nav.home_link" },
  { to: "/target", label: "Target", icon: PiggyBank, ocid: "nav.goals_link" },
  { to: "/musik", label: "Musik", icon: Music, ocid: "nav.music_link" },
  {
    to: "/pengaturan",
    label: "Pengaturan",
    icon: Settings,
    ocid: "nav.settings_link",
  },
  {
    to: "/admin",
    label: "Admin",
    icon: Shield,
    ocid: "nav.admin_link",
    adminOnly: true,
  },
];

interface AppShellProps {
  background: string | null;
  children: React.ReactNode;
}

/** Compact sign-in button / identity chip for the glass top bar. */
function IdentityControl() {
  const { isAuthenticated, isInitializing, principal, login, logout } =
    useAuth();

  if (isInitializing) {
    return (
      <span
        data-ocid="auth.loading_state"
        aria-hidden="true"
        className="h-8 w-24 animate-pulse rounded-full bg-secondary"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={login}
        data-ocid="auth.signin_button"
        className="signin-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogIn className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Masuk dengan Internet Identity</span>
        <span className="sm:hidden">Masuk</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        data-ocid="auth.identity_chip"
        className="identity-chip"
        title={principal ?? undefined}
      >
        <span className="identity-avatar" aria-hidden="true">
          {principal?.slice(0, 2) ?? "II"}
        </span>
        <span className="hidden font-mono text-xs sm:inline">{principal}</span>
      </span>
      <button
        type="button"
        onClick={logout}
        data-ocid="auth.signout_button"
        aria-label="Keluar"
        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Mobile-first app shell: glass top bar, bottom nav on mobile, sidebar on desktop. */
export function AppShell({ background, children }: AppShellProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { isAdmin } = useAuth();

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <div
      className="app-shell-bg relative min-h-dvh"
      style={background ? { backgroundImage: `url(${background})` } : undefined}
    >
      <div className="bg-scrim min-h-dvh">
        <header className="surface-glass sticky top-0 z-30 border-b border-border/60">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
            <Link
              to="/"
              data-ocid="nav.brand_link"
              className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <PiggyBank className="size-5" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                Celengan
              </span>
            </Link>

            <nav
              aria-label="Navigasi utama"
              className="hidden items-center gap-1 md:flex"
            >
              {navItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-ocid={item.ocid}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-smooth",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <IdentityControl />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-16">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-24 pt-2 text-center text-xs text-muted-foreground md:px-8 md:pb-8">
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              window.location.hostname,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="transition-smooth hover:text-foreground"
          >
            © {new Date().getFullYear()}. Built with love using caffeine.ai
          </a>
        </footer>

        <MiniPlayer />
        <FullPlayer />

        <nav
          aria-label="Navigasi bawah"
          className="surface-glass fixed inset-x-0 bottom-0 z-30 border-t border-border/60 md:hidden"
        >
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-ocid={item.ocid}
                  className={cn(
                    "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-smooth",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon
                    className={cn("size-5", active && "drop-shadow")}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
