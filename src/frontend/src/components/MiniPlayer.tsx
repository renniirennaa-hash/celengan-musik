import { formatPlaybackTime, useMusicPlayer } from "@/hooks/use-music-player";
import { cn } from "@/lib/utils";
import { ChevronUp, Pause, Play, Square } from "lucide-react";

/** Equalizer bars shown while a track is playing. */
function EqualizerBars() {
  return (
    <span
      aria-hidden="true"
      className="flex h-4 items-end gap-[2px] text-primary"
    >
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="waveform-bar waveform-bar-played w-[3px] animate-equalizer"
          style={{
            height: "100%",
            animationDelay: `${bar * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Persistent mini-player. Docked above the mobile bottom nav and at the
 * viewport base on desktop; it stays mounted across route changes.
 */
export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    toggle,
    stop,
    setFullPlayerOpen,
  } = useMusicPlayer();

  if (!currentTrack) return null;

  const total = duration > 0 ? duration : currentTrack.durationSeconds;
  const progress = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0;

  return (
    <div
      data-ocid="player.mini_player"
      className="pb-player-dock pointer-events-none fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-40 px-3 md:bottom-0 md:px-6"
    >
      <div className="surface-player pointer-events-auto mx-auto w-full max-w-3xl animate-player-rise overflow-hidden rounded-2xl shadow-player-dock">
        <progress
          className="seek-rail block h-[3px] w-full appearance-none border-0"
          aria-label="Kemajuan lagu"
          max={100}
          value={progress}
        />

        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            data-ocid="player.expand_button"
            onClick={() => setFullPlayerOpen(true)}
            aria-label="Buka pemutar penuh"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <EqualizerBars />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {currentTrack.title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {isLoading
                  ? "Memuat…"
                  : `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(total)}`}
              </span>
            </span>
          </button>

          <button
            type="button"
            data-ocid="player.play_pause_button"
            onClick={toggle}
            aria-label={isPlaying ? "Jeda lagu" : "Putar lagu"}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-smooth",
              "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {isPlaying ? (
              <Pause className="size-5" aria-hidden="true" />
            ) : (
              <Play className="size-5 translate-x-[1px]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-ocid="player.expand_icon_button"
            onClick={() => setFullPlayerOpen(true)}
            aria-label="Buka pemutar penuh"
            className="hidden size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
          >
            <ChevronUp className="size-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            data-ocid="player.stop_button"
            onClick={stop}
            aria-label="Hentikan dan tutup pemutar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Square className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
