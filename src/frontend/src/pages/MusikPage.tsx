import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMusicPlayer } from "@/hooks/use-music-player";
import { useCreateTrack, useDeleteTrack, useTracks } from "@/hooks/use-tracks";
import { searchArchive, toArchiveTrack, toArchiveTracks } from "@/lib/archive";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ArchiveItem, PlayableTrack, TrackView } from "@/types/music";
import { toPlayableTrack } from "@/types/music";
import { ExternalBlob } from "@caffeineai/object-storage";
import {
  AlertCircle,
  CloudUpload,
  Loader2,
  Music,
  Pause,
  Play,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"];
const ACCEPTED_MIME_PREFIX = "audio/";

/**
 * Canonical content type per extension. The backend validates `contentType`
 * against a strict allowlist and traps on anything else, so the browser's
 * reported `file.type` (which varies by OS: `audio/mpeg3`, `audio/vnd.wave`,
 * `audio/opus`, …) must be normalized to a value the backend accepts.
 */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};

/** Content types the backend accepts, used to keep the two sides in sync. */
const BACKEND_ALLOWED_CONTENT_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
]);

/** How long to wait for the browser to report a file's duration. */
const DURATION_PROBE_TIMEOUT_MS = 5000;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(1)} MB`;
}

/** The file's extension in lowercase, including the leading dot. */
function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Resolve the content type to send to the backend. Prefer the extension's
 * canonical type so a valid file is never rejected because the OS reported an
 * unusual MIME string; fall back to the browser value when it is already
 * allowlisted.
 */
function resolveContentType(file: File): string {
  const canonical = CONTENT_TYPE_BY_EXTENSION[fileExtension(file.name)];
  if (canonical) return canonical;
  const reported = file.type.trim().toLowerCase();
  if (BACKEND_ALLOWED_CONTENT_TYPES.has(reported)) return reported;
  return "audio/mpeg";
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${`${secs}`.padStart(2, "0")}`;
}

function isAcceptedAudio(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  return file.type.startsWith(ACCEPTED_MIME_PREFIX);
}

/**
 * Read an audio file's duration in the browser before uploading it.
 *
 * Duration is optional metadata, so the probe is bounded: a codec the browser
 * cannot decode, or a metadata read that never settles, resolves to 0 instead
 * of hanging the upload forever.
 */
function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
    const finish = (value: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      finish(Number.isFinite(audio.duration) ? audio.duration : 0);
    });
    audio.addEventListener("error", () => finish(0));
    timer = setTimeout(() => finish(0), DURATION_PROBE_TIMEOUT_MS);
    audio.src = url;
  });
}

interface TrackRowProps {
  track: PlayableTrack;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete?: () => void;
  ocid: string;
}

/** One playable row shared by the archive results and the upload list. */
function TrackRow({
  track,
  isCurrent,
  isPlaying,
  onPlay,
  onDelete,
  ocid,
}: TrackRowProps) {
  return (
    <li
      data-ocid={ocid}
      className={cn(
        "track-row flex items-center gap-3 rounded-2xl px-3 py-2.5",
        isCurrent && "track-row-active",
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={
          isCurrent && isPlaying
            ? `Jeda ${track.title}`
            : `Putar ${track.title}`
        }
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full transition-smooth",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isCurrent
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground",
        )}
      >
        {isCurrent && isPlaying ? (
          <Pause className="size-5" aria-hidden="true" />
        ) : (
          <Play className="size-5 translate-x-[1px]" aria-hidden="true" />
        )}
      </button>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {track.title}
        </span>
        <span className="block truncate text-xs opacity-70">
          {track.artist}
        </span>
      </span>

      <span className="font-figure shrink-0 text-xs tabular-nums opacity-70">
        {formatDuration(track.durationSeconds)}
      </span>

      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Hapus ${track.title}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

/** Musik — Internet Archive search plus the user's own uploaded tracks. */
export function MusikPage() {
  const { currentTrack, isPlaying, play, toggle } = useMusicPlayer();
  const tracksQuery = useTracks();
  const createTrack = useCreateTrack();
  const deleteTrack = useDeleteTrack();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArchiveItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TrackView | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadedTracks = tracksQuery.data ?? [];
  const uploadedQueue = uploadedTracks.map(toPlayableTrack);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const items = await searchArchive(trimmed);
      setResults(items);
    } catch {
      setResults(null);
      setSearchError("Pencarian gagal. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayArchive = (item: ArchiveItem) => {
    const queue = toArchiveTracks(item);
    const primary = toArchiveTrack(item) ?? queue[0];
    if (!primary) return;
    if (currentTrack?.id === primary.id) {
      toggle();
      return;
    }
    play(primary, queue);
  };

  const handlePlayUpload = (track: TrackView) => {
    const playable = toPlayableTrack(track);
    if (currentTrack?.id === playable.id) {
      toggle();
      return;
    }
    play(playable, uploadedQueue);
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!isAcceptedAudio(file)) {
      setUploadError(
        "Format tidak didukung. Gunakan berkas MP3, WAV, OGG, atau M4A.",
      );
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(
        `Ukuran berkas melebihi batas ${formatBytes(MAX_FILE_BYTES)}.`,
      );
      return;
    }

    const contentType = resolveContentType(file);

    setUploadProgress(0);
    try {
      const durationSeconds = await readAudioDuration(file);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(
        bytes,
        contentType,
        file.name,
      ).withUploadProgress((percentage) => setUploadProgress(percentage));

      await createTrack.mutateAsync({
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "Unggahan saya",
        durationSeconds: BigInt(Math.round(durationSeconds)),
        contentType,
        sizeBytes: BigInt(file.size),
        blob,
        originalFilename: file.name,
      });
      setUploadProgress(null);
    } catch {
      setUploadProgress(null);
      setUploadError("Unggahan gagal. Coba lagi.");
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    deleteTrack.mutate(id, {
      onSuccess: () => setPendingDelete(null),
      onError: () => setPendingDelete(null),
    });
  };

  const isUploading = uploadProgress !== null;

  return (
    <div data-ocid="musik.page" className="space-y-8">
      <header className="space-y-1">
        <p className="label-eyebrow">Musik</p>
        <h1 className="font-display text-2xl font-semibold">
          Perpustakaan Musik
        </h1>
        <p className="text-sm text-muted-foreground">
          Cari musik domain publik dari Internet Archive atau unggah koleksi
          Anda sendiri.
        </p>
      </header>

      {/* ── Cari Musik ─────────────────────────────────────────────── */}
      <section data-ocid="musik.search_section" className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold">Cari Musik</h2>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            data-ocid="musik.search_input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari judul, kreator, atau genre…"
            aria-label="Kata kunci pencarian musik"
            className="h-11 rounded-full"
          />
          <Button
            type="submit"
            data-ocid="musik.search_button"
            disabled={isSearching || query.trim().length === 0}
            className="h-11 shrink-0 rounded-full px-5"
          >
            {isSearching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            Cari
          </Button>
        </form>

        {isSearching ? (
          <div
            data-ocid="musik.search_loading_state"
            className="surface-card flex items-center justify-center gap-3 rounded-3xl px-6 py-10 text-sm text-muted-foreground"
          >
            <Loader2
              className="size-5 animate-spin text-primary"
              aria-hidden="true"
            />
            Mencari di Internet Archive…
          </div>
        ) : searchError ? (
          <div
            data-ocid="musik.search_error_state"
            className="surface-card flex items-start gap-3 rounded-3xl px-5 py-4 text-sm"
          >
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{searchError}</span>
          </div>
        ) : results === null ? (
          <EmptyState
            ocid="musik.search_empty_state"
            icon={Search}
            title="Belum ada pencarian"
            description="Masukkan kata kunci untuk menjelajahi ribuan rekaman domain publik di Internet Archive."
          />
        ) : results.length === 0 ? (
          <EmptyState
            ocid="musik.search_no_results_state"
            icon={Music}
            title="Tidak ada hasil"
            description="Tidak ada musik yang cocok dengan kata kunci itu. Coba kata kunci lain."
          />
        ) : (
          <ul data-ocid="musik.search_list" className="space-y-2">
            {results.map((item, index) => {
              const primary = toArchiveTrack(item);
              const isCurrent =
                primary !== null && currentTrack?.id === primary.id;
              return (
                <TrackRow
                  key={item.identifier}
                  ocid={`musik.search_item.${index + 1}`}
                  track={
                    primary ?? {
                      id: `archive:${item.identifier}`,
                      title: item.title,
                      artist: item.creator,
                      src: "",
                      durationSeconds: 0,
                      source: "archive",
                    }
                  }
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  onPlay={() => handlePlayArchive(item)}
                />
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Musik Saya ─────────────────────────────────────────────── */}
      <section data-ocid="musik.uploads_section" className="space-y-4">
        <div className="flex items-center gap-2">
          <CloudUpload className="size-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold">Musik Saya</h2>
        </div>

        <div
          data-ocid="musik.dropzone"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "dropzone flex flex-col items-center rounded-3xl px-6 py-8 text-center",
            isDragging && "dropzone-active",
          )}
        >
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Upload className="size-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium">
            Tarik berkas audio ke sini, atau
          </p>
          <Button
            type="button"
            data-ocid="musik.upload_button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-3 rounded-full px-5"
          >
            Pilih Berkas
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            MP3, WAV, OGG, atau M4A · maksimal {formatBytes(MAX_FILE_BYTES)}
          </p>
          <input
            ref={fileInputRef}
            data-ocid="musik.file_input"
            type="file"
            accept=".mp3,.wav,.ogg,.m4a,audio/*"
            className="sr-only"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {isUploading ? (
          <div
            data-ocid="musik.upload_progress"
            className="surface-card space-y-2 rounded-2xl px-4 py-3"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Mengunggah berkas…</span>
              <span className="font-figure tabular-nums">
                {Math.round(uploadProgress ?? 0)}%
              </span>
            </div>
            <progress
              className="seek-rail block h-1.5 w-full appearance-none overflow-hidden rounded-full border-0"
              aria-label="Kemajuan unggahan"
              max={100}
              value={uploadProgress ?? 0}
            />
          </div>
        ) : null}

        {uploadError ? (
          <div
            data-ocid="musik.upload_error_state"
            className="surface-card flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
          >
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{uploadError}</span>
          </div>
        ) : null}

        {tracksQuery.isLoading ? (
          <div
            data-ocid="musik.uploads_loading_state"
            className="surface-card flex items-center justify-center gap-3 rounded-3xl px-6 py-10 text-sm text-muted-foreground"
          >
            <Loader2
              className="size-5 animate-spin text-primary"
              aria-hidden="true"
            />
            Memuat koleksi Anda…
          </div>
        ) : uploadedTracks.length === 0 ? (
          <EmptyState
            ocid="musik.uploads_empty_state"
            icon={Music}
            title="Belum ada lagu"
            description="Unggah berkas audio pertama Anda untuk memutarnya langsung di dalam aplikasi."
            actionLabel="Pilih Berkas"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <ul data-ocid="musik.uploads_list" className="space-y-2">
            {uploadedTracks.map((track, index) => {
              const playable = toPlayableTrack(track);
              const isCurrent = currentTrack?.id === playable.id;
              return (
                <TrackRow
                  key={track.id.toString()}
                  ocid={`musik.upload_item.${index + 1}`}
                  track={playable}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && isPlaying}
                  onPlay={() => handlePlayUpload(track)}
                  onDelete={() => setPendingDelete(track)}
                />
              );
            })}
          </ul>
        )}

        {uploadedTracks.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {formatNumber(uploadedTracks.length)} lagu tersimpan di koleksi
            Anda.
          </p>
        ) : null}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Hapus lagu ini?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" akan dihapus dari koleksi Anda. Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isPending={deleteTrack.isPending}
        onConfirm={handleConfirmDelete}
        ocid="musik.delete"
      />
    </div>
  );
}
