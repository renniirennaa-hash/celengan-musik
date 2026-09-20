const BACKGROUND_KEY = "celengan.background";

/** Read the persisted background image data URL, or null when unset. */
export function readBackground(): string | null {
  try {
    const value = window.localStorage.getItem(BACKGROUND_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Persist a background image data URL.
 * Returns `true` when the value was stored, `false` when storage is
 * unavailable or the quota was exceeded — callers must surface that failure
 * instead of pretending the image was saved.
 */
export function writeBackground(dataUrl: string): boolean {
  try {
    window.localStorage.setItem(BACKGROUND_KEY, dataUrl);
    return true;
  } catch {
    return false;
  }
}

/** Remove the persisted background image. */
export function clearBackground(): void {
  try {
    window.localStorage.removeItem(BACKGROUND_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Read a File as a data URL. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Berkas tidak dapat dibaca."));
      }
    };
    reader.onerror = () => reject(new Error("Berkas tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}
