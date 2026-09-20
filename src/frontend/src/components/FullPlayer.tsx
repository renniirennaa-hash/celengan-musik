import { formatPlaybackTime, useMusicPlayer } from "@/hooks/use-music-player";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef } from "react";

/** Full-screen player overlay with a large seek bar and transport controls. */
export function FullPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isFullPlayerOpen,
    isLoading,
    error,
    toggle,
    seek,
    next,
    prev,
    setVolume,
    setFullPlayerOpen,
  } = useMusicPlayer();

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Open the native modal dialog and move focus to the close control.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isFullPlayerOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!isFullPlayerOpen && dialog.open) {
      dialog.close();
    }
  }, [isFullPlayerOpen]);

  // Escape closes the overlay.
  useEffect(() => {
    if (!isFullPlayerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullPlayerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullPlayerOpen, setFullPlayerOpen]);

  if (!isFullPlayerOpen || !currentTrack) return null;

  const total = duration > 0 ? duration : currentTrack.durationSeconds;
  const progress = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <dialog
      ref={dialogRef}
      data-ocid="player.full_player"
      aria-label="Pemutar musik"
      onClose={() => setFullPlayerOpen(false)}
      className="fixed inset-0 z-50 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col bg-background/95 p-0 backdrop-blur-xl open:flex"
    >
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <span className="label-eyebrow">Sedang diputar</span>
          <button
            ref={closeButtonRef}
            type="button"
            data-ocid="player.close_button"
            onClick={() => setFullPlayerOpen(false)}
            aria-label="Tutup pemutar penuh"
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown className="size-6" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-border bg-secondary shadow-elevated">
            {currentTrack.artworkUrl ? (
              <img
                src={currentTrack.artworkUrl}
                alt={`Sampul ${currentTrack.title}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-end justify-center gap-1.5 p-10">
                {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                  <span
                    key={bar}
                    className={cn(
                      "waveform-bar w-2",
                      isPlaying && "waveform-bar-played animate-equalizer",
                    )}
                    style={{
                      height: `${30 + ((bar * 17) % 60)}%`,
                      animationDelay: `${bar * 0.12}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-full text-center">
            <h2 className="truncate font-display text-xl font-semibold text-foreground">
              {currentTrack.title}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {currentTrack.artist}
            </p>
          </div>

          <div className="w-full">
            <input
              type="range"
              data-ocid="player.seek_input"
              min={0}
              max={Math.max(total, 1)}
              step={1}
              value={Math.min(currentTime, Math.max(total, 1))}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Posisi lagu"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[oklch(var(--seek-track))] accent-[oklch(var(--seek-fill))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                background: `linear-gradient(to right, oklch(var(--seek-fill)) ${progress}%, oklch(var(--seek-track)) ${progress}%)`,
              }}
            />
            <div className="mt-2 flex items-center justify-between font-figure text-xs text-muted-foreground">
              <span>{formatPlaybackTime(currentTime)}</span>
              <span>{formatPlaybackTime(total)}</span>
            </div>
          </div>

          {error ? (
            <p
              data-ocid="player.error_state"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              data-ocid="player.prev_button"
              onClick={prev}
              aria-label="Lagu sebelumnya"
              className="flex size-12 items-center justify-center rounded-full text-foreground transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SkipBack className="size-6" aria-hidden="true" />
            </button>

            <button
              type="button"
              data-ocid="player.play_pause_button"
              onClick={toggle}
              aria-label={isPlaying ? "Jeda lagu" : "Putar lagu"}
              className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isPlaying ? (
                <Pause className="size-7" aria-hidden="true" />
              ) : (
                <Play className="size-7 translate-x-[2px]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              data-ocid="player.next_button"
              onClick={next}
              aria-label="Lagu berikutnya"
              className="flex size-12 items-center justify-center rounded-full text-foreground transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SkipForward className="size-6" aria-hidden="true" />
            </button>
          </div>

          {isLoading ? (
            <p
              data-ocid="player.loading_state"
              className="text-xs text-muted-foreground"
            >
              Memuat lagu…
            </p>
          ) : null}

          <div className="flex w-full max-w-xs items-center gap-3">
            <VolumeIcon
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="range"
              data-ocid="player.volume_input"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="Volume"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[oklch(var(--seek-track))] accent-[oklch(var(--seek-fill))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}
