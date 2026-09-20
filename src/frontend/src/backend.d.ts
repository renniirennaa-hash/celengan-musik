import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export interface Cell {
    value: Value;
    name: string;
}
export interface CreateDepositInput {
    date: DateText;
    note?: string;
    goalId: GoalId;
    amount: Rupiah;
}
export interface CreateGoalInput {
    name: string;
    photoUrl: string;
    targetAmount: Rupiah;
    targetDate: DateText;
    startDate: DateText;
}
export interface CreateTrackInput {
    title: string;
    originalFilename: string;
    contentType: string;
    blob: ExternalBlob;
    durationSeconds: bigint;
    artist: string;
    sizeBytes: bigint;
}
export type DateText = string;
export type DepositId = bigint;
export interface DepositView {
    id: DepositId;
    date: DateText;
    note?: string;
    createdAt: Timestamp;
    goalId: GoalId;
    amount: Rupiah;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type GoalId = bigint;
export interface GoalProgress {
    isReached: boolean;
    depositCount: bigint;
    goalId: GoalId;
    isOverdue: boolean;
    remaining: Rupiah;
    daysRemaining: bigint;
    percentage: number;
    totalDeposits: Rupiah;
}
export interface GoalStats {
    depositCount: bigint;
    goalId: GoalId;
    remaining: Rupiah;
    averageDeposit: number;
    totalDeposits: Rupiah;
}
export interface GoalView {
    id: GoalId;
    name: string;
    createdAt: Timestamp;
    photoUrl: string;
    targetAmount: Rupiah;
    targetDate: DateText;
    startDate: DateText;
}
export interface LastSendResult {
    message: string;
    timestamp: Timestamp;
    success: boolean;
}
export type ReminderError = {
    __kind__: "invalidPhoneNumber";
    invalidPhoneNumber: string;
} | {
    __kind__: "notConfigured";
    notConfigured: null;
} | {
    __kind__: "sendFailed";
    sendFailed: string;
} | {
    __kind__: "invalidSenderNumber";
    invalidSenderNumber: string;
} | {
    __kind__: "invalidCredentials";
    invalidCredentials: string;
};
export interface ReminderSettingsView {
    apiKeySidSet: boolean;
    accountSidMasked: string;
    apiKeySidMasked: string;
    apiKeySecretSet: boolean;
    senderNumber: string;
    enabled: boolean;
    phoneNumber: string;
    accountSidSet: boolean;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Rupiah = bigint;
export interface SaveReminderSettingsInput {
    accountSid: string;
    senderNumber: string;
    apiKeySid: string;
    enabled: boolean;
    apiKeySecret: string;
    phoneNumber: string;
}
export type SavingsError = {
    __kind__: "invalidInput";
    invalidInput: string;
} | {
    __kind__: "goalNotFound";
    goalNotFound: GoalId;
} | {
    __kind__: "depositNotFound";
    depositNotFound: DepositId;
};
export interface SendResult {
    message: string;
    timestamp: Timestamp;
    success: boolean;
}
export type Timestamp = bigint;
export type TrackId = bigint;
export interface TrackView {
    id: TrackId;
    title: string;
    originalFilename: string;
    contentType: string;
    blob: ExternalBlob;
    createdAt: Timestamp;
    durationSeconds: bigint;
    artist: string;
    sizeBytes: bigint;
}
export interface TrendPoint {
    total: Rupiah;
    period: string;
    count: bigint;
}
export interface UpdateDepositInput {
    id: DepositId;
    date: DateText;
    note?: string;
    amount: Rupiah;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum TrendPeriod {
    monthly = "monthly",
    daily = "daily"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Add a deposit to one of the caller's savings goals.
     */
    addDeposit(input: CreateDepositInput): Promise<{
        __kind__: "ok";
        ok: DepositView;
    } | {
        __kind__: "err";
        err: SavingsError;
    }>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Create a new savings goal for the caller.
     */
    createGoal(input: CreateGoalInput): Promise<GoalView>;
    /**
     * / Register an uploaded audio track in the shared library.
     */
    createTrack(input: CreateTrackInput): Promise<TrackView>;
    /**
     * / Delete an existing deposit owned by the caller.
     */
    deleteDeposit(id: bigint): Promise<boolean>;
    /**
     * / Delete a savings goal and all of its deposits.
     */
    deleteGoal(id: bigint): Promise<boolean>;
    /**
     * / Delete an uploaded audio track.
     */
    deleteTrack(id: bigint): Promise<boolean>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Static Markdown documentation of the backend's public API.
     */
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Fetch a single savings goal owned by the caller.
     */
    getGoal(id: bigint): Promise<GoalView | null>;
    /**
     * / Read the last reminder send result (admin only).
     */
    getLastReminderSend(): Promise<LastSendResult | null>;
    /**
     * / Compute progress for one of the caller's savings goals.
     */
    getProgress(goalId: bigint, today: DateText): Promise<GoalProgress | null>;
    /**
     * / Read the current reminder settings (admin only). Secrets are masked.
     */
    getReminderSettings(): Promise<ReminderSettingsView>;
    /**
     * / Compute aggregate statistics for one of the caller's savings goals.
     */
    getStats(goalId: bigint): Promise<GoalStats | null>;
    /**
     * / Fetch a single uploaded audio track.
     */
    getTrack(id: bigint): Promise<TrackView | null>;
    /**
     * / Compute the deposit trend for one of the caller's savings goals.
     */
    getTrend(goalId: bigint, period: TrendPeriod): Promise<Array<TrendPoint>>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Whether the reminder is fully configured (admin only).
     */
    isReminderConfigured(): Promise<boolean>;
    /**
     * / List the deposits of one of the caller's savings goals, newest first.
     */
    listDeposits(goalId: bigint): Promise<Array<DepositView>>;
    /**
     * / List every savings goal owned by the caller.
     */
    listGoals(): Promise<Array<GoalView>>;
    /**
     * / List every uploaded audio track, newest first.
     */
    listTracks(): Promise<Array<TrackView>>;
    /**
     * / Save the reminder settings (admin only).
     */
    saveReminderSettings(input: SaveReminderSettingsInput): Promise<{
        __kind__: "ok";
        ok: ReminderSettingsView;
    } | {
        __kind__: "err";
        err: ReminderError;
    }>;
    schema(): Promise<string>;
    /**
     * / Send the daily reminder SMS immediately (admin only).
     */
    sendReminderNow(): Promise<SendResult>;
    /**
     * / Update an existing deposit owned by the caller.
     */
    updateDeposit(input: UpdateDepositInput): Promise<{
        __kind__: "ok";
        ok: DepositView;
    } | {
        __kind__: "err";
        err: SavingsError;
    }>;
}
