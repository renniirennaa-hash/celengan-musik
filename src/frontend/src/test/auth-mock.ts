import type { UserRole } from "@/backend";
import { vi } from "vitest";

/**
 * A typed local stand-in for the Internet Identity session the app reads
 * through `useInternetIdentity`. `use-auth.ts` destructures exactly these
 * fields, so a component test can drive signed-out, signed-in, and admin
 * states without a real identity provider or a canister.
 */
export interface MockIdentityState {
  identity: { getPrincipal: () => { toText: () => string } } | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

/** A signed-out visitor: no identity, no session, provider already settled. */
export function signedOutIdentity(): MockIdentityState {
  return {
    identity: null,
    isAuthenticated: false,
    isInitializing: false,
    login: vi.fn(),
    clear: vi.fn(),
  };
}

/** A signed-in caller with the given principal text. */
export function signedInIdentity(
  principalText = "aaaaa-aa",
): MockIdentityState {
  return {
    identity: { getPrincipal: () => ({ toText: () => principalText }) },
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(),
    clear: vi.fn(),
  };
}

/**
 * Build the `@caffeineai/core-infrastructure` mock the app's hooks consume.
 * `useActor` returns the supplied typed actor; `useInternetIdentity` returns
 * the supplied session state. Both are read on every render, so a test can
 * mutate the returned object between renders to change the caller.
 */
export function coreInfrastructureMock(
  actor: unknown,
  identity: MockIdentityState,
) {
  return {
    useActor: () => ({ actor, isFetching: false }),
    useInternetIdentity: () => identity,
  };
}

/** The role the backend reports for the caller in a test. */
export type { UserRole };
