import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseRupiahInput, todayDateText } from "@/lib/format";
import { readFileAsDataUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { GoalFormValues } from "@/types/savings";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const EMPTY_FORM: GoalFormValues = {
  name: "",
  photoUrl: "",
  targetAmount: "",
  startDate: "",
  targetDate: "",
};

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    photoUrl: string;
    targetAmount: bigint;
    startDate: string;
    targetDate: string;
  }) => void;
  isPending: boolean;
  submitError: string | null;
}

/** Create-goal dialog with a required photo upload. */
export function GoalFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  submitError,
}: GoalFormDialogProps) {
  const [values, setValues] = useState<GoalFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValues({ ...EMPTY_FORM, startDate: todayDateText() });
      setErrors({});
    }
  }, [open]);

  const update = (patch: Partial<GoalFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({
        ...current,
        photoUrl: "Berkas harus berupa gambar (JPG, PNG, atau WebP).",
      }));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((current) => ({
        ...current,
        photoUrl: "Ukuran foto maksimal 4 MB.",
      }));
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      update({ photoUrl: dataUrl });
      setErrors((current) => ({ ...current, photoUrl: "" }));
    } catch {
      setErrors((current) => ({
        ...current,
        photoUrl: "Foto tidak dapat dibaca. Coba berkas lain.",
      }));
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const name = values.name.trim();
    const amount = parseRupiahInput(values.targetAmount);

    if (!name) nextErrors.name = "Nama target wajib diisi.";
    if (!values.photoUrl) nextErrors.photoUrl = "Foto target wajib diunggah.";
    if (amount === null || amount <= 0n) {
      nextErrors.targetAmount = "Nominal target harus lebih dari Rp0.";
    }
    if (!values.startDate) nextErrors.startDate = "Tanggal mulai wajib diisi.";
    if (!values.targetDate) {
      nextErrors.targetDate = "Tanggal tujuan wajib diisi.";
    } else if (values.startDate && values.targetDate < values.startDate) {
      nextErrors.targetDate =
        "Tanggal tujuan tidak boleh sebelum tanggal mulai.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || amount === null) return;

    onSubmit({
      name,
      photoUrl: values.photoUrl,
      targetAmount: amount,
      startDate: values.startDate,
      targetDate: values.targetDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="goal_form.dialog"
        className="surface-card max-h-[90vh] overflow-y-auto rounded-3xl border-border sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Target Tabungan Baru
          </DialogTitle>
          <DialogDescription>
            Tentukan tujuan menabung, unggah foto target, dan tetapkan tenggat
            waktunya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-name">Nama target</Label>
            <Input
              id="goal-name"
              data-ocid="goal_form.name_input"
              value={values.name}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="Contoh: Liburan ke Jepang"
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? (
              <p
                data-ocid="goal_form.name_error"
                className="text-xs text-destructive"
              >
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-photo">Foto target (wajib)</Label>
            <input
              ref={fileInputRef}
              id="goal-photo"
              data-ocid="goal_form.upload_button"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                void handlePhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {values.photoUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-border">
                <img
                  src={values.photoUrl}
                  alt="Pratinjau foto target"
                  className="h-40 w-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Hapus foto target"
                  data-ocid="goal_form.remove_photo_button"
                  className="absolute right-2 top-2 size-8 rounded-full"
                  onClick={() => update({ photoUrl: "" })}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                data-ocid="goal_form.dropzone"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-muted/40 text-sm text-muted-foreground transition-smooth",
                  "hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {photoBusy ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus className="size-5" aria-hidden="true" />
                )}
                <span>Ketuk untuk mengunggah foto</span>
              </button>
            )}
            {errors.photoUrl ? (
              <p
                data-ocid="goal_form.photo_error"
                className="text-xs text-destructive"
              >
                {errors.photoUrl}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-amount">Nominal target (Rp)</Label>
            <Input
              id="goal-amount"
              data-ocid="goal_form.amount_input"
              inputMode="numeric"
              value={values.targetAmount}
              onChange={(event) =>
                update({
                  targetAmount: event.target.value.replace(/[^\d]/g, ""),
                })
              }
              placeholder="15000000"
              autoComplete="off"
              aria-invalid={Boolean(errors.targetAmount)}
            />
            {errors.targetAmount ? (
              <p
                data-ocid="goal_form.amount_error"
                className="text-xs text-destructive"
              >
                {errors.targetAmount}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-start">Tanggal mulai</Label>
              <Input
                id="goal-start"
                data-ocid="goal_form.start_date_input"
                type="date"
                value={values.startDate}
                onChange={(event) => update({ startDate: event.target.value })}
                aria-invalid={Boolean(errors.startDate)}
              />
              {errors.startDate ? (
                <p
                  data-ocid="goal_form.start_date_error"
                  className="text-xs text-destructive"
                >
                  {errors.startDate}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">Tanggal tujuan</Label>
              <Input
                id="goal-target"
                data-ocid="goal_form.target_date_input"
                type="date"
                value={values.targetDate}
                onChange={(event) => update({ targetDate: event.target.value })}
                aria-invalid={Boolean(errors.targetDate)}
              />
              {errors.targetDate ? (
                <p
                  data-ocid="goal_form.target_date_error"
                  className="text-xs text-destructive"
                >
                  {errors.targetDate}
                </p>
              ) : null}
            </div>
          </div>

          {submitError ? (
            <p
              data-ocid="goal_form.error_state"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {submitError}
            </p>
          ) : null}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              data-ocid="goal_form.cancel_button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="rounded-full px-5"
              data-ocid="goal_form.submit_button"
              disabled={isPending || photoBusy}
            >
              {isPending ? "Menyimpan…" : "Simpan target"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
