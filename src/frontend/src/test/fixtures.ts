import type {
  LastSendResult,
  ReminderSettingsView,
  SendResult,
  UserRole,
} from "@/backend";
import type { TrackView } from "@/types/music";
import type {
  DepositView,
  GoalProgress,
  GoalStats,
  GoalView,
  TrendPoint,
} from "@/types/savings";
import { vi } from "vitest";

/**
 * A typed local stand-in for the generated `Backend` actor. Every method the
 * frontend calls is present, so a component test exercises the real hooks and
 * query wiring against deterministic data instead of a live canister.
 */
export interface MockActor {
  listGoals: ReturnType<typeof vi.fn>;
  getGoal: ReturnType<typeof vi.fn>;
  createGoal: ReturnType<typeof vi.fn>;
  deleteGoal: ReturnType<typeof vi.fn>;
  addDeposit: ReturnType<typeof vi.fn>;
  listDeposits: ReturnType<typeof vi.fn>;
  updateDeposit: ReturnType<typeof vi.fn>;
  deleteDeposit: ReturnType<typeof vi.fn>;
  getProgress: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
  getTrend: ReturnType<typeof vi.fn>;
  listTracks: ReturnType<typeof vi.fn>;
  getTrack: ReturnType<typeof vi.fn>;
  createTrack: ReturnType<typeof vi.fn>;
  deleteTrack: ReturnType<typeof vi.fn>;
  getReminderSettings: ReturnType<typeof vi.fn>;
  saveReminderSettings: ReturnType<typeof vi.fn>;
  isReminderConfigured: ReturnType<typeof vi.fn>;
  sendReminderNow: ReturnType<typeof vi.fn>;
  getLastReminderSend: ReturnType<typeof vi.fn>;
  getCallerUserRole: ReturnType<typeof vi.fn>;
  isCallerAdmin: ReturnType<typeof vi.fn>;
  _initialize_access_control: ReturnType<typeof vi.fn>;
}

export function createMockActor(): MockActor {
  return {
    listGoals: vi.fn(async () => [] as GoalView[]),
    getGoal: vi.fn(async () => null),
    createGoal: vi.fn(),
    deleteGoal: vi.fn(async () => true),
    addDeposit: vi.fn(),
    listDeposits: vi.fn(async () => [] as DepositView[]),
    updateDeposit: vi.fn(),
    deleteDeposit: vi.fn(async () => true),
    getProgress: vi.fn(async () => null),
    getStats: vi.fn(async () => null),
    getTrend: vi.fn(async () => [] as TrendPoint[]),
    listTracks: vi.fn(async () => [] as TrackView[]),
    getTrack: vi.fn(async () => null),
    createTrack: vi.fn(),
    deleteTrack: vi.fn(async () => true),
    getReminderSettings: vi.fn(async () => makeReminderSettings()),
    saveReminderSettings: vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: makeReminderSettings(),
    })),
    isReminderConfigured: vi.fn(async () => false),
    sendReminderNow: vi.fn(async () => makeSendResult()),
    getLastReminderSend: vi.fn(async () => null as LastSendResult | null),
    getCallerUserRole: vi.fn(async () => "guest" as UserRole),
    isCallerAdmin: vi.fn(async () => false),
    _initialize_access_control: vi.fn(async () => undefined),
  };
}

/** Reminder settings as the backend returns them: secrets masked, never full. */
export function makeReminderSettings(
  overrides: Partial<ReminderSettingsView> = {},
): ReminderSettingsView {
  return {
    phoneNumber: "",
    senderNumber: "",
    enabled: false,
    accountSidSet: false,
    apiKeySidSet: false,
    apiKeySecretSet: false,
    accountSidMasked: "",
    apiKeySidMasked: "",
    ...overrides,
  };
}

/** A fully configured reminder: all credentials stored, secrets masked. */
export function makeConfiguredReminderSettings(
  overrides: Partial<ReminderSettingsView> = {},
): ReminderSettingsView {
  return makeReminderSettings({
    phoneNumber: "+628123456789",
    senderNumber: "+15551234567",
    enabled: true,
    accountSidSet: true,
    apiKeySidSet: true,
    apiKeySecretSet: true,
    accountSidMasked: "••••1234",
    apiKeySidMasked: "••••abcd",
    ...overrides,
  });
}

export function makeSendResult(
  overrides: Partial<SendResult> = {},
): SendResult {
  return {
    timestamp: 1_700_000_000_000_000_000n,
    success: true,
    message: "Pengingat terkirim (SID: SM123)",
    ...overrides,
  };
}

export function makeLastSendResult(
  overrides: Partial<LastSendResult> = {},
): LastSendResult {
  return makeSendResult(overrides);
}

/**
 * A minimal stand-in for the object-storage `ExternalBlob` the backend returns.
 * `toPlayableTrack` only calls `getDirectURL`, so that is all the frontend
 * consumer contract needs from the blob.
 */
export function makeBlob(url = "https://example.test/audio.mp3") {
  return {
    getDirectURL: () => url,
    withUploadProgress: () => makeBlob(url),
  };
}

export function makeTrack(overrides: Partial<TrackView> = {}): TrackView {
  return {
    id: 1n,
    title: "Lagu Saya",
    artist: "Unggahan saya",
    durationSeconds: 180n,
    contentType: "audio/mpeg",
    sizeBytes: 1_000_000n,
    blob: makeBlob() as unknown as TrackView["blob"],
    originalFilename: "lagu.mp3",
    createdAt: 1_700_000_000_000_000_000n,
    ...overrides,
  };
}

export function makeGoal(overrides: Partial<GoalView> = {}): GoalView {
  return {
    id: 1n,
    name: "Liburan ke Jepang",
    photoUrl: "data:image/png;base64,AAAA",
    targetAmount: 10_000_000n,
    startDate: "2026-01-01",
    targetDate: "2026-12-31",
    createdAt: 1_700_000_000_000_000_000n,
    ...overrides,
  };
}

export function makeProgress(
  overrides: Partial<GoalProgress> = {},
): GoalProgress {
  return {
    goalId: 1n,
    totalDeposits: 2_500_000n,
    depositCount: 2n,
    remaining: 7_500_000n,
    percentage: 25,
    isReached: false,
    isOverdue: false,
    daysRemaining: 30n,
    ...overrides,
  };
}

export function makeStats(overrides: Partial<GoalStats> = {}): GoalStats {
  return {
    goalId: 1n,
    totalDeposits: 2_500_000n,
    depositCount: 2n,
    averageDeposit: 1_250_000,
    remaining: 7_500_000n,
    ...overrides,
  };
}

export function makeDeposit(overrides: Partial<DepositView> = {}): DepositView {
  return {
    id: 1n,
    goalId: 1n,
    amount: 1_500_000n,
    date: "2026-02-01",
    note: "Bonus bulanan",
    createdAt: 1_700_000_000_000_000_000n,
    ...overrides,
  };
}
