import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

/** Fallback page for unknown routes. */
export function NotFoundPage() {
  return (
    <div
      data-ocid="not_found.page"
      className="surface-card flex flex-col items-center rounded-3xl px-6 py-16 text-center"
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Compass className="size-7" aria-hidden="true" />
      </div>
      <h1 className="font-display text-2xl font-semibold">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Tautan yang kamu buka tidak tersedia. Kembali ke beranda untuk
        melanjutkan menabung.
      </p>
      <Button asChild className="mt-6 rounded-full px-5">
        <Link to="/" data-ocid="not_found.home_button">
          Kembali ke beranda
        </Link>
      </Button>
    </div>
  );
}
