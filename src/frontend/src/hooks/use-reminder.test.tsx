import {
  describeReminderError,
  useSaveReminderSettings,
  useSendReminderNow,
} from "@/hooks/use-reminder";
import { createMockActor, makeSendResult } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The reminder hooks translate the backend's `ReminderError` variant into the
// Indonesian message the admin page shows, and unwrap the `#ok`/`#err` result.
// This is the frontend/backend consumer seam: the actor is a typed local mock,
// so the test pins the mapping the app relies on without a canister.
const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

function SaveHarness() {
  const save = useSaveReminderSettings();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          save.mutate(
            {
              phoneNumber: "+628123456789",
              senderNumber: "+15551234567",
              accountSid: "AC123",
              apiKeySid: "SK123",
              apiKeySecret: "secret",
              enabled: true,
            },
            { onError: () => {} },
          )
        }
      >
        save
      </button>
      <span data-ocid="harness.error">{save.error?.message ?? "none"}</span>
    </div>
  );
}

function SendHarness() {
  const send = useSendReminderNow();
  return (
    <div>
      <button
        type="button"
        onClick={() => send.mutate(undefined, { onError: () => {} })}
      >
        send
      </button>
      <span data-ocid="harness.result">
        {send.data ? String(send.data.success) : "none"}
      </span>
    </div>
  );
}

function renderHarness(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("describeReminderError", () => {
  it("maps each backend variant to its Indonesian message", () => {
    expect(
      describeReminderError({
        __kind__: "invalidPhoneNumber",
        invalidPhoneNumber: "Nomor HP salah",
      }),
    ).toBe("Nomor HP salah");
    expect(
      describeReminderError({
        __kind__: "invalidSenderNumber",
        invalidSenderNumber: "Nomor pengirim salah",
      }),
    ).toBe("Nomor pengirim salah");
    expect(
      describeReminderError({
        __kind__: "invalidCredentials",
        invalidCredentials: "Kredensial salah",
      }),
    ).toBe("Kredensial salah");
    expect(
      describeReminderError({ __kind__: "notConfigured", notConfigured: null }),
    ).toBe("Pengingat belum dikonfigurasi.");
    expect(
      describeReminderError({
        __kind__: "sendFailed",
        sendFailed: "Gagal kirim",
      }),
    ).toBe("Gagal kirim");
  });
});

describe("useSaveReminderSettings", () => {
  it("unwraps the ok result and calls the actor with the input", async () => {
    actor.saveReminderSettings.mockResolvedValue({
      __kind__: "ok",
      ok: {
        phoneNumber: "+628123456789",
        senderNumber: "+15551234567",
        enabled: true,
        accountSidSet: true,
        apiKeySidSet: true,
        apiKeySecretSet: true,
        accountSidMasked: "••••1234",
        apiKeySidMasked: "••••abcd",
      },
    });
    const user = userEvent.setup();
    renderHarness(<SaveHarness />);

    await user.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() =>
      expect(actor.saveReminderSettings).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "+628123456789" }),
      ),
    );
    expect(screen.getByTestId("harness.error")).toHaveTextContent("none");
  });

  it("surfaces the backend's error variant as the mutation error", async () => {
    actor.saveReminderSettings.mockResolvedValue({
      __kind__: "err",
      err: {
        __kind__: "invalidCredentials",
        invalidCredentials: "Account SID harus diawali 'AC'",
      },
    });
    const user = userEvent.setup();
    renderHarness(<SaveHarness />);

    await user.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() =>
      expect(screen.getByTestId("harness.error")).toHaveTextContent(
        "Account SID harus diawali 'AC'",
      ),
    );
  });
});

describe("useSendReminderNow", () => {
  it("returns the send result from the actor", async () => {
    actor.sendReminderNow.mockResolvedValue(
      makeSendResult({ success: true, message: "Pengingat terkirim" }),
    );
    const user = userEvent.setup();
    renderHarness(<SendHarness />);

    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() =>
      expect(screen.getByTestId("harness.result")).toHaveTextContent("true"),
    );
    expect(actor.sendReminderNow).toHaveBeenCalledTimes(1);
  });
});
