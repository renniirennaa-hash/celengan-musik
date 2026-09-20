import { Button } from "@/components/ui/button";
import {
  useIsReminderConfigured,
  useLastReminderSend,
  useReminderSettings,
  useSaveReminderSettings,
  useSendReminderNow,
} from "@/hooks/use-reminder";
import { timestampToDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PHONE_PATTERN = /^\+62\d{7,13}$/;
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

/** Client-side check for an Indonesian phone number in +62 format. */
function phoneError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Nomor wajib diisi.";
  if (!trimmed.startsWith("+62")) {
    return "Nomor harus diawali +62 (contoh: +628123456789).";
  }
  if (!PHONE_PATTERN.test(trimmed)) {
    return "Format nomor tidak valid. Gunakan +62 diikuti 7–13 digit angka.";
  }
  return null;
}

/**
 * Client-side check for a Twilio sender number. The backend accepts any E.164
 * number, so a non-Indonesian Twilio sender (e.g. +15551234567) is valid here.
 */
function senderError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Nomor pengirim wajib diisi.";
  if (!E164_PATTERN.test(trimmed)) {
    return "Format nomor tidak valid. Gunakan format E.164, contoh +15551234567.";
  }
  return null;
}

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Format a backend nanosecond timestamp as an Indonesian date + WIB time. */
function formatTimestamp(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "Waktu tidak diketahui";
  return `${dateTimeFormatter.format(date)} WIB`;
}

/** Admin page: reminder configuration, Twilio credentials, and manual send. */
export function AdminPage() {
  const settingsQuery = useReminderSettings();
  const configuredQuery = useIsReminderConfigured();
  const lastSendQuery = useLastReminderSend();
  const saveSettings = useSaveReminderSettings();
  const sendNow = useSendReminderNow();

  const settings = settingsQuery.data;
  const isConfigured = configuredQuery.data === true;

  const [phoneNumber, setPhoneNumber] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [apiKeySid, setApiKeySid] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [accountSid, setAccountSid] = useState("");

  // Hydrate the non-secret fields once the stored settings arrive, so a reload
  // shows the configured destination/sender numbers and the real enabled state.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !settings) return;
    hydratedRef.current = true;
    setPhoneNumber(settings.phoneNumber);
    setSenderNumber(settings.senderNumber);
    setEnabled(settings.enabled);
  }, [settings]);

  const [phoneTouched, setPhoneTouched] = useState(false);
  const [senderTouched, setSenderTouched] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const phoneValidation = phoneError(phoneNumber);
  const senderValidation = senderError(senderNumber);

  const handleSave = () => {
    setPhoneTouched(true);
    setSenderTouched(true);
    setSaveMessage(null);
    setSaveError(null);

    if (phoneValidation || senderValidation) return;

    saveSettings.mutate(
      {
        phoneNumber: phoneNumber.trim(),
        senderNumber: senderNumber.trim(),
        accountSid: accountSid.trim(),
        apiKeySid: apiKeySid.trim(),
        apiKeySecret: apiKeySecret.trim(),
        enabled,
      },
      {
        onSuccess: () => {
          setSaveMessage("Pengaturan pengingat berhasil disimpan.");
          setApiKeySid("");
          setApiKeySecret("");
          setAccountSid("");
        },
        onError: (error) => setSaveError(error.message),
      },
    );
  };

  const handleSendNow = () => {
    setSendError(null);
    sendNow.mutate(undefined, {
      onError: (error) => setSendError(error.message),
    });
  };

  const lastSend = lastSendQuery.data ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <span className="label-eyebrow">Admin</span>
        <h1 className="mt-1 font-display text-2xl font-semibold md:text-3xl">
          Pengingat Setoran
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur nomor tujuan dan kredensial Twilio untuk pengingat setoran harian
          pukul 19.00 WIB.
        </p>
      </div>

      {/* Card 1 — status, phone number, sender number, toggle */}
      <section
        data-ocid="admin.status_card"
        className="surface-card flex flex-col gap-5 rounded-3xl p-5 md:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Status &amp; nomor tujuan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nomor yang menerima pengingat setoran harian.
            </p>
          </div>
          <span
            data-ocid="admin.status_badge"
            className={cn(
              "badge-status",
              isConfigured ? "badge-configured" : "badge-unconfigured",
            )}
          >
            {isConfigured ? (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-3.5" aria-hidden="true" />
            )}
            {isConfigured ? "Terkonfigurasi" : "Belum terkonfigurasi"}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="admin-phone" className="field-label">
            Nomor HP tujuan
          </label>
          <input
            id="admin-phone"
            data-ocid="admin.phone_input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="field-input px-3.5 py-2.5 text-sm"
            placeholder="+628123456789"
            value={phoneNumber}
            aria-invalid={phoneTouched && phoneValidation ? "true" : undefined}
            aria-describedby="admin-phone-helper"
            onChange={(event) => setPhoneNumber(event.target.value)}
            onBlur={() => setPhoneTouched(true)}
          />
          {phoneTouched && phoneValidation ? (
            <p
              id="admin-phone-helper"
              data-ocid="admin.phone_error"
              className="field-error text-xs"
            >
              {phoneValidation}
            </p>
          ) : (
            <p id="admin-phone-helper" className="field-helper text-xs">
              Gunakan format Indonesia dengan kode negara, contoh +628123456789.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="admin-sender" className="field-label">
            Nomor pengirim Twilio
          </label>
          <input
            id="admin-sender"
            data-ocid="admin.sender_input"
            type="tel"
            inputMode="tel"
            className="field-input px-3.5 py-2.5 text-sm"
            placeholder="+628123456789"
            value={senderNumber}
            aria-invalid={
              senderTouched && senderValidation ? "true" : undefined
            }
            aria-describedby="admin-sender-helper"
            onChange={(event) => setSenderNumber(event.target.value)}
            onBlur={() => setSenderTouched(true)}
          />
          {senderTouched && senderValidation ? (
            <p
              id="admin-sender-helper"
              data-ocid="admin.sender_error"
              className="field-error text-xs"
            >
              {senderValidation}
            </p>
          ) : (
            <p id="admin-sender-helper" className="field-helper text-xs">
              Nomor Twilio yang terdaftar dan mendukung pengiriman SMS ke
              Indonesia, dalam format E.164 (contoh +15551234567).
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Pengingat harian aktif</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kirim SMS otomatis setiap hari pukul 19.00 WIB.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Aktifkan pengingat harian"
            data-ocid="admin.enabled_switch"
            onClick={() => setEnabled((current) => !current)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              enabled ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block size-5 rounded-full bg-background shadow transition-transform",
                enabled ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      </section>

      {/* Card 2 — Twilio credentials */}
      <section
        data-ocid="admin.credentials_card"
        className="surface-card flex flex-col gap-5 rounded-3xl p-5 md:p-6"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">
            Kredensial Twilio
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kredensial disimpan di backend dan tidak pernah ditampilkan kembali
            secara lengkap. Biarkan kolom kosong untuk mempertahankan nilai yang
            tersimpan.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="admin-api-key-sid" className="field-label">
            API Key SID
          </label>
          <input
            id="admin-api-key-sid"
            data-ocid="admin.api_key_sid_input"
            type="text"
            autoComplete="off"
            className="field-input px-3.5 py-2.5 font-mono text-sm"
            placeholder={
              settings?.apiKeySidSet
                ? settings.apiKeySidMasked
                : "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            }
            value={apiKeySid}
            onChange={(event) => setApiKeySid(event.target.value)}
          />
          <p className="field-helper text-xs">
            {settings?.apiKeySidSet
              ? "Kredensial tersimpan. Kosongkan untuk mempertahankannya."
              : "Belum ada API Key SID tersimpan."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="admin-api-key-secret" className="field-label">
            API Key Secret
          </label>
          <input
            id="admin-api-key-secret"
            data-ocid="admin.api_key_secret_input"
            type="password"
            autoComplete="new-password"
            className="field-input px-3.5 py-2.5 font-mono text-sm"
            placeholder={
              settings?.apiKeySecretSet
                ? "••••••••••••"
                : "Masukkan API Key Secret"
            }
            value={apiKeySecret}
            onChange={(event) => setApiKeySecret(event.target.value)}
          />
          <p className="field-helper text-xs">
            {settings?.apiKeySecretSet
              ? "Secret tersimpan. Kosongkan untuk mempertahankannya."
              : "Belum ada API Key Secret tersimpan."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="admin-account-sid" className="field-label">
            Account SID
          </label>
          <input
            id="admin-account-sid"
            data-ocid="admin.account_sid_input"
            type="text"
            autoComplete="off"
            className="field-input px-3.5 py-2.5 font-mono text-sm"
            placeholder={
              settings?.accountSidSet
                ? settings.accountSidMasked
                : "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            }
            value={accountSid}
            onChange={(event) => setAccountSid(event.target.value)}
          />
          <p className="field-helper text-xs">
            {settings?.accountSidSet
              ? "Kredensial tersimpan. Kosongkan untuk mempertahankannya."
              : "Belum ada Account SID tersimpan."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className="w-full rounded-full px-5 sm:w-auto sm:self-start"
            data-ocid="admin.save_button"
            disabled={saveSettings.isPending}
            onClick={handleSave}
          >
            {saveSettings.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-4" aria-hidden="true" />
            )}
            {saveSettings.isPending ? "Menyimpan…" : "Simpan pengaturan"}
          </Button>

          {saveMessage ? (
            <p
              data-ocid="admin.save_success_state"
              className="result-row result-success"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {saveMessage}
            </p>
          ) : null}

          {saveError ? (
            <p
              data-ocid="admin.save_error_state"
              className="result-row result-failure"
            >
              <XCircle className="size-4 shrink-0" aria-hidden="true" />
              {saveError}
            </p>
          ) : null}
        </div>
      </section>

      {/* Card 3 — last send result */}
      <section
        data-ocid="admin.last_send_card"
        className="surface-card flex flex-col gap-4 rounded-3xl p-5 md:p-6"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">
            Hasil pengiriman terakhir
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Status pengiriman pengingat paling akhir.
          </p>
        </div>

        {lastSendQuery.isLoading ? (
          <div
            data-ocid="admin.last_send_loading_state"
            className="flex items-center gap-3 text-sm text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Memuat hasil terakhir…
          </div>
        ) : lastSend ? (
          <div
            data-ocid="admin.last_send_result"
            className={cn(
              "result-row",
              lastSend.success ? "result-success" : "result-failure",
            )}
          >
            {lastSend.success ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="size-4 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-medium">
                {lastSend.success ? "Berhasil terkirim" : "Gagal terkirim"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs opacity-90">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                {formatTimestamp(lastSend.timestamp)}
              </p>
              <p className="mt-1 break-words text-xs opacity-90">
                {lastSend.message}
              </p>
            </div>
          </div>
        ) : (
          <p
            data-ocid="admin.last_send_empty_state"
            className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
          >
            Belum ada pengingat yang dikirim.
          </p>
        )}
      </section>

      {/* Bottom action — manual send */}
      <section data-ocid="admin.send_section" className="flex flex-col gap-3">
        <Button
          type="button"
          className={cn(
            "w-full rounded-full px-5 py-6 text-base",
            !isConfigured && "btn-disabled",
          )}
          data-ocid="admin.send_now_button"
          disabled={!isConfigured || sendNow.isPending}
          onClick={handleSendNow}
        >
          {sendNow.isPending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-5" aria-hidden="true" />
          )}
          {sendNow.isPending ? "Mengirim…" : "Kirim pengingat sekarang"}
        </Button>

        {!isConfigured ? (
          <p
            data-ocid="admin.send_disabled_reason"
            className="text-center text-xs text-muted-foreground"
          >
            Lengkapi nomor tujuan dan kredensial Twilio, lalu simpan pengaturan
            untuk mengaktifkan tombol ini.
          </p>
        ) : null}

        {sendError ? (
          <p
            data-ocid="admin.send_error_state"
            className="result-row result-failure"
          >
            <XCircle className="size-4 shrink-0" aria-hidden="true" />
            {sendError}
          </p>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Setiap SMS dikirim melalui akun Twilio milikmu sendiri dan dikenakan
          biaya nyata. Pengiriman otomatis harian dijadwalkan dari aplikasi dan
          bisa saja tidak tepat pada pukul 19.00 WIB.
        </p>
      </section>
    </div>
  );
}
