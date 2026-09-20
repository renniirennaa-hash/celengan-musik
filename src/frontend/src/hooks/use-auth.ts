import { createActor } from "@/backend";
import type { UserRole } from "@/backend";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export const callerRoleKey = ["caller-role"] as const;
export const callerIsAdminKey = ["caller-is-admin"] as const;

export interface AuthState {
  /** True when a valid, non-anonymous identity is present (login or restored session). */
  isAuthenticated: boolean;
  /** True while the identity provider is still restoring a stored session. */
  isInitializing: boolean;
  /** Shortened principal text for display, or null when signed out. */
  principal: string | null;
  /** Full principal text, or null when signed out. */
  principalText: string | null;
  /** The caller's role as reported by the backend. */
  role: UserRole | null;
  /** True only when the backend reports the caller as admin. */
  isAdmin: boolean;
  /** True while the role lookup is in flight. */
  isRoleLoading: boolean;
  /** Open the Internet Identity sign-in flow. */
  login: () => void;
  /** Clear the identity and sign out. */
  logout: () => void;
}

/** Shorten a principal for compact display: `abcd-1234-…-wxyz`. */
export function shortenPrincipal(principal: string): string {
  if (principal.length <= 16) return principal;
  return `${principal.slice(0, 5)}…${principal.slice(-5)}`;
}

/**
 * Internet Identity session state plus the caller's backend role.
 *
 * The identity provider is mounted in `main.tsx`, so this hook only reads it.
 * Role lookups are skipped while signed out, so unauthenticated visitors never
 * trigger a backend call and never see an error.
 */
export function useAuth(): AuthState {
  const { identity, isAuthenticated, isInitializing, login, clear } =
    useInternetIdentity();
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();

  const principalText = identity ? identity.getPrincipal().toText() : null;

  // The first authenticated caller becomes admin. Run once per principal.
  // The role queries below are enabled as soon as the caller is authenticated,
  // so on a fresh canister they can resolve before this update call completes
  // and trap with "User is not registered". Invalidate both role keys once the
  // initialization settles so the queries re-run against the registered caller.
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!actor || isFetching || !principalText) return;
    if (initializedFor.current === principalText) return;
    initializedFor.current = principalText;
    void actor
      ._initialize_access_control()
      .catch(() => {
        // A non-first caller is rejected here; the role query below is the
        // source of truth, so a failure is not surfaced to the user.
      })
      .finally(() => {
        void queryClient.invalidateQueries({ queryKey: callerRoleKey });
        void queryClient.invalidateQueries({ queryKey: callerIsAdminKey });
      });
  }, [actor, isFetching, principalText, queryClient]);

  const roleQuery = useQuery<UserRole>({
    queryKey: callerRoleKey,
    queryFn: async () => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    retry: false,
  });

  const adminQuery = useQuery<boolean>({
    queryKey: callerIsAdminKey,
    queryFn: async () => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    retry: false,
  });

  return {
    isAuthenticated,
    isInitializing,
    principal: principalText ? shortenPrincipal(principalText) : null,
    principalText,
    role: roleQuery.data ?? null,
    isAdmin: adminQuery.data === true,
    isRoleLoading:
      isAuthenticated && (roleQuery.isLoading || adminQuery.isLoading),
    login: () => login(),
    logout: () => clear(),
  };
}
