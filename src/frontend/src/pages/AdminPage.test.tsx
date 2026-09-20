import { AdminPage } from "@/pages/AdminPage";
import {
  createMockActor,
  makeConfiguredReminderSettings,
  makeLastSendResult,
  makeReminderSettings,
} from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The admin page is the frontend/backend consumer seam for the reminder
// feature: it reads the settings view, the configured flag, and the last send
// result, and it writes settings and triggers a manual send. The actor is a
// typed local mock, so this pins the contract the page relies on without a
// canister. The backend's own validation and SMS send are not exercised here.
const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  actor.getReminderSettings.mockResolvedValue(makeReminderSettings());
  actor.isReminderConfigured.mockResolvedValue(false);
  actor.getLastReminderSend.mockResolvedValue(null);
});

describe("AdminPage status and manual send", () => {
  it("shows 'Belum terkonfigurasi' and disables the send button when unconfigured", async () => {
    renderPage();

    expect(await screen.findByText("Belum terkonfigurasi")).toBeInTheDocument();
    expect(screen.getByTestId("admin.send_now_button")).toBeDisabled();
    expect(
      screen.getByTestId("admin.send_disabled_reason"),
    ).toBeInTheDocument();
  });

  it("shows 'Terkonfigurasi' and enables the send button when configured", async () => {
    actor.getReminderSettings.mockResolvedValue(
      makeConfiguredReminderSettings(),
    );
    actor.isReminderConfigured.mockResolvedValue(true);
    renderPage();

    expect(await screen.findByText("Terkonfigurasi")).toBeInTheDocument();
    expect(screen.getByTestId("admin.send_now_button")).toBeEnabled();
    expect(
      screen.queryByTestId("admin.send_disabled_reason"),
    ).not.toBeInTheDocument();
  });

  it("sends the reminder and shows the last send result", async () => {
    actor.getReminderSettings.mockResolvedValue(
      makeConfiguredReminderSettings(),
    );
    actor.isReminderConfigured.mockResolvedValue(true);
    actor.sendReminderNow.mockResolvedValue(
      makeLastSendResult({ success: true, message: "Pengingat terkirim" }),
    );
    actor.getLastReminderSend.mockResolvedValue(
      makeLastSendResult({ success: true, message: "Pengingat terkirim" }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByTestId("admin.send_now_button"));

    await waitFor(() => expect(actor.sendReminderNow).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByTestId("admin.last_send_result"),
    ).toHaveTextContent("Berhasil terkirim");
  });

  it("shows the empty last-send state before any send", async () => {
    renderPage();

    expect(
      await screen.findByTestId("admin.last_send_empty_state"),
    ).toHaveTextContent("Belum ada pengingat yang dikirim.");
  });
});

describe("AdminPage phone validation", () => {
  it("rejects a number without the +62 prefix with a clear message", async () => {
    const user = userEvent.setup();
    renderPage();

    const phone = await screen.findByTestId("admin.phone_input");
    await user.type(phone, "+15551234567");
    await user.click(screen.getByTestId("admin.save_button"));

    expect(await screen.findByTestId("admin.phone_error")).toHaveTextContent(
      "Nomor harus diawali +62",
    );
    expect(actor.saveReminderSettings).not.toHaveBeenCalled();
  });

  it("rejects an empty phone number", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId("admin.phone_input");
    await user.click(screen.getByTestId("admin.save_button"));

    expect(await screen.findByTestId("admin.phone_error")).toHaveTextContent(
      "Nomor wajib diisi.",
    );
    expect(actor.saveReminderSettings).not.toHaveBeenCalled();
  });

  it("saves a valid +62 number and the Twilio credentials", async () => {
    actor.saveReminderSettings.mockResolvedValue({
      __kind__: "ok",
      ok: makeConfiguredReminderSettings(),
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByTestId("admin.phone_input"),
      "+628123456789",
    );
    await user.type(screen.getByTestId("admin.sender_input"), "+15551234567");
    await user.type(screen.getByTestId("admin.api_key_sid_input"), "SK123");
    await user.type(
      screen.getByTestId("admin.api_key_secret_input"),
      "secret-value",
    );
    await user.type(screen.getByTestId("admin.account_sid_input"), "AC123");
    await user.click(screen.getByTestId("admin.save_button"));

    await waitFor(() =>
      expect(actor.saveReminderSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: "+628123456789",
          senderNumber: "+15551234567",
          apiKeySid: "SK123",
          apiKeySecret: "secret-value",
          accountSid: "AC123",
        }),
      ),
    );
    expect(
      await screen.findByTestId("admin.save_success_state"),
    ).toBeInTheDocument();
  });

  it("surfaces the backend's validation error instead of a success message", async () => {
    actor.saveReminderSettings.mockResolvedValue({
      __kind__: "err",
      err: {
        __kind__: "invalidPhoneNumber",
        invalidPhoneNumber: "Nomor HP harus dalam format Indonesia",
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByTestId("admin.phone_input"),
      "+628123456789",
    );
    await user.type(screen.getByTestId("admin.sender_input"), "+15551234567");
    await user.click(screen.getByTestId("admin.save_button"));

    expect(
      await screen.findByTestId("admin.save_error_state"),
    ).toHaveTextContent("Nomor HP harus dalam format Indonesia");
  });
});

describe("AdminPage credential masking", () => {
  it("never renders a stored secret in full, only the masked placeholder", async () => {
    actor.getReminderSettings.mockResolvedValue(
      makeConfiguredReminderSettings({
        accountSidMasked: "••••1234",
        apiKeySidMasked: "••••abcd",
      }),
    );
    actor.isReminderConfigured.mockResolvedValue(true);
    renderPage();

    const accountSid = await screen.findByTestId("admin.account_sid_input");
    const apiKeySid = screen.getByTestId("admin.api_key_sid_input");
    const apiKeySecret = screen.getByTestId("admin.api_key_secret_input");

    // The stored values are never hydrated into the inputs; only masked
    // placeholders are shown, and the secret field stays empty.
    await waitFor(() =>
      expect(accountSid).toHaveAttribute("placeholder", "••••1234"),
    );
    expect(accountSid).toHaveValue("");
    expect(apiKeySid).toHaveValue("");
    expect(apiKeySecret).toHaveValue("");
    expect(apiKeySid).toHaveAttribute("placeholder", "••••abcd");
    expect(apiKeySecret).toHaveAttribute("placeholder", "••••••••••••");
  });

  it("hydrates the non-secret destination and sender numbers on reload", async () => {
    actor.getReminderSettings.mockResolvedValue(
      makeConfiguredReminderSettings(),
    );
    actor.isReminderConfigured.mockResolvedValue(true);
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("admin.phone_input")).toHaveValue(
        "+628123456789",
      ),
    );
    expect(screen.getByTestId("admin.sender_input")).toHaveValue(
      "+15551234567",
    );
  });
});
