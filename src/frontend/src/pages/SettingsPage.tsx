import { Button } from "@/components/ui/button";
import { useBackground } from "@/hooks/use-background";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useRef } from "react";

/** Settings page: app background personalization. */
export function SettingsPage() {
  const { background, error, isBusy, setFromFile, reset, clearError } =
    useBackground();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="label-eyebrow">Pengaturan</span>
        <h1 className="mt-1 font-display text-2xl font-semibold md:text-3xl">
          Tampilan Aplikasi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sesuaikan latar aplikasi dengan gambar favoritmu. Pengaturan tersimpan
          otomatis di perangkat ini.
        </p>
      </div>

      <section
        data-ocid="settings.background_section"
        className="surface-card flex flex-col gap-5 rounded-3xl p-5 md:p-6"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">
            Background aplikasi
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unggah gambar (JPG, PNG, atau WebP, maksimal 2 MB). Lapisan gelap
            otomatis menjaga teks tetap terbaca.
          </p>
        </div>

        <div
          className={cn(
            "relative flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted",
          )}
        >
          {background ? (
            <>
              <img
                src={background}
                alt="Pratinjau background aplikasi"
                className="size-full object-cover"
              />
              <div className="bg-scrim-strong absolute inset-0" />
              <span className="relative rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                Pratinjau dengan lapisan gelap
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImagePlus className="size-6" aria-hidden="true" />
              <span className="text-sm">Belum ada background khusus</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          data-ocid="settings.upload_button"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void setFromFile(file);
            event.target.value = "";
          }}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            className="rounded-full px-5"
            data-ocid="settings.choose_image_button"
            disabled={isBusy}
            onClick={() => {
              clearError();
              fileInputRef.current?.click();
            }}
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-4" aria-hidden="true" />
            )}
            {background ? "Ganti gambar" : "Unggah gambar"}
          </Button>
          {background ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5 text-destructive hover:text-destructive"
              data-ocid="settings.reset_background_button"
              onClick={reset}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Hapus background
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5"
              data-ocid="settings.default_background_button"
              disabled
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Menggunakan default
            </Button>
          )}
        </div>

        {error ? (
          <p
            data-ocid="settings.error_state"
            className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
      </section>

      <section
        data-ocid="settings.about_section"
        className="surface-card flex flex-col gap-2 rounded-3xl p-5 md:p-6"
      >
        <h2 className="font-display text-lg font-semibold">Tentang Celengan</h2>
        <p className="text-sm text-muted-foreground">
          Celengan membantu kamu mencatat setoran, memantau progres, dan
          menghitung sisa hari menuju setiap target tabungan. Data target dan
          setoran tersimpan di canister pribadimu, sedangkan preferensi tampilan
          tersimpan di browser ini.
        </p>
      </section>
    </div>
  );
}
