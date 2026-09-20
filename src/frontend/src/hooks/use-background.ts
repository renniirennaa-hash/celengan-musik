import {
  clearBackground,
  readBackground,
  readFileAsDataUrl,
  writeBackground,
} from "@/lib/storage";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// A file of N bytes becomes ~1.37N bytes as a base64 data URL, and
// localStorage quotas are typically ~5 MB. Cap the source file at 2 MB so the
// encoded value stays comfortably inside the quota.
const MAX_BACKGROUND_BYTES = 2 * 1024 * 1024;
const MAX_BACKGROUND_LABEL = "2 MB";

interface BackgroundContextValue {
  background: string | null;
  error: string | null;
  isBusy: boolean;
  setFromFile: (file: File) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

/** Provides the user-uploaded app background to the whole app. */
export function BackgroundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [background, setBackground] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setBackground(readBackground());
  }, []);

  const setFromFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      setError(`Ukuran gambar maksimal ${MAX_BACKGROUND_LABEL}.`);
      return;
    }
    setIsBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!writeBackground(dataUrl)) {
        setError(
          "Gambar gagal disimpan di penyimpanan browser. Coba gambar yang lebih kecil.",
        );
        return;
      }
      setBackground(dataUrl);
    } catch {
      setError("Gambar tidak dapat dibaca. Coba berkas lain.");
    } finally {
      setIsBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    clearBackground();
    setBackground(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ background, error, isBusy, setFromFile, reset, clearError }),
    [background, error, isBusy, setFromFile, reset, clearError],
  );

  return createElement(BackgroundContext.Provider, { value }, children);
}

/** Access the shared background controller. */
export function useBackground(): BackgroundContextValue {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error("useBackground harus dipakai di dalam BackgroundProvider.");
  }
  return context;
}
