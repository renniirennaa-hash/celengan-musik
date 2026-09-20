import type { PlayableTrack } from "@/types/music";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface MusicPlayerContextValue {
  /** The track currently loaded into the player, or null when idle. */
  currentTrack: PlayableTrack | null;
  /** The queue the current track was played from. */
  queue: PlayableTrack[];
  isPlaying: boolean;
  /** Playback position in seconds. */
  currentTime: number;
  /** Track duration in seconds; 0 until the media metadata loads. */
  duration: number;
  /** Output volume, 0–1. */
  volume: number;
  /** True while the full-screen player overlay is open. */
  isFullPlayerOpen: boolean;
  /** True when the audio element is buffering. */
  isLoading: boolean;
  /** Human-readable playback error, or null. */
  error: string | null;
  /** Play a track, optionally within a queue. */
  play: (track: PlayableTrack, queue?: PlayableTrack[]) => void;
  /** Toggle play/pause for the current track. */
  toggle: () => void;
  /** Seek to an absolute position in seconds. */
  seek: (seconds: number) => void;
  /** Jump to the next track in the queue. */
  next: () => void;
  /** Jump to the previous track in the queue. */
  prev: () => void;
  /** Stop playback and clear the current track. */
  stop: () => void;
  /** Set the output volume, 0–1. */
  setVolume: (value: number) => void;
  /** Open or close the full-screen player overlay. */
  setFullPlayerOpen: (open: boolean) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

/**
 * Owns the single persistent HTMLAudioElement for the whole app.
 *
 * The element is created once and kept in a ref, so it lives outside the
 * router tree and playback survives navigation between pages.
 */
export function MusicPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayableTrack | null>(null);
  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isFullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create the audio element exactly once, outside the React tree.
  if (audioRef.current === null && typeof window !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "metadata";
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setError(null);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError("Lagu tidak dapat diputar. Coba lagu lain.");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Tear the element down only when the provider itself unmounts.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const play = useCallback(
    (track: PlayableTrack, nextQueue?: PlayableTrack[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (nextQueue) setQueue(nextQueue);
      setError(null);
      setIsLoading(true);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.durationSeconds);
      audio.src = track.src;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
        setError(
          "Pemutaran diblokir browser. Tekan tombol putar untuk memulai.",
        );
      });
    },
    [],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      void audio.play().catch(() => {
        setError("Pemutaran diblokir browser. Coba lagi.");
      });
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, seconds);
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const step = useCallback(
    (offset: number) => {
      if (!currentTrack || queue.length === 0) return;
      const index = queue.findIndex((item) => item.id === currentTrack.id);
      if (index === -1) return;
      const nextIndex = (index + offset + queue.length) % queue.length;
      const nextTrack = queue[nextIndex];
      if (nextTrack) play(nextTrack);
    },
    [currentTrack, queue, play],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setCurrentTrack(null);
    setQueue([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(false);
    setError(null);
    setFullPlayerOpen(false);
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.min(1, Math.max(0, value)));
  }, []);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      isFullPlayerOpen,
      isLoading,
      error,
      play,
      toggle,
      seek,
      next,
      prev,
      stop,
      setVolume,
      setFullPlayerOpen,
    }),
    [
      currentTrack,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      isFullPlayerOpen,
      isLoading,
      error,
      play,
      toggle,
      seek,
      next,
      prev,
      stop,
      setVolume,
    ],
  );

  return createElement(MusicPlayerContext.Provider, { value }, children);
}

/** Access the shared music player controller. */
export function useMusicPlayer(): MusicPlayerContextValue {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error(
      "useMusicPlayer harus dipakai di dalam MusicPlayerProvider.",
    );
  }
  return context;
}

/** Format a second count as m:ss (or h:mm:ss past an hour). */
export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${`${minutes}`.padStart(2, "0")}:${`${secs}`.padStart(2, "0")}`;
  }
  return `${minutes}:${`${secs}`.padStart(2, "0")}`;
}
