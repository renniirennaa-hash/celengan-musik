import type { ArchiveFile, ArchiveItem, PlayableTrack } from "@/types/music";

const SEARCH_ENDPOINT = "https://archive.org/advancedsearch.php";
const METADATA_ENDPOINT = "https://archive.org/metadata";
const DOWNLOAD_BASE = "https://archive.org/download";
const THUMB_BASE = "https://archive.org/services/img";

/** Audio formats the Internet Archive serves that browsers can play. */
const PLAYABLE_FORMATS = new Set([
  "VBR MP3",
  "MP3",
  "128Kbps MP3",
  "64Kbps MP3",
  "32Kbps MP3",
  "Ogg Vorbis",
  "Flac",
  "24bit Flac",
  "WAVE",
  "AIFF",
]);

const LOSSLESS_FORMATS = new Set(["Flac", "24bit Flac", "WAVE", "AIFF"]);

interface SearchDoc {
  identifier?: string;
  title?: string | string[];
  creator?: string | string[];
  year?: string | number;
  description?: string | string[];
  downloads?: number;
}

interface SearchResponse {
  response?: {
    docs?: SearchDoc[];
    numFound?: number;
  };
}

interface MetadataFile {
  name?: string;
  format?: string;
  size?: string | number;
  length?: string | number;
}

interface MetadataResponse {
  files?: MetadataFile[];
}

function firstText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Strip the HTML the Archive sometimes embeds in descriptions. */
function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse an Archive "length" value ("231.42", "3:51", "1:02:03") to seconds. */
export function parseArchiveLength(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }
  const seconds = Number(trimmed);
  return Number.isFinite(seconds) ? seconds : 0;
}

/** Build the direct stream URL for a file inside an Archive item. */
export function archiveStreamUrl(identifier: string, filename: string): string {
  return `${DOWNLOAD_BASE}/${encodeURIComponent(identifier)}/${filename
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

/** Cover art for an Archive item. */
export function archiveArtworkUrl(identifier: string): string {
  return `${THUMB_BASE}/${encodeURIComponent(identifier)}`;
}

function toArchiveFile(file: MetadataFile): ArchiveFile | null {
  const name = file.name ?? "";
  const format = file.format ?? "";
  if (!name || !PLAYABLE_FORMATS.has(format)) return null;
  const size = Number(file.size);
  return {
    name,
    format,
    sizeBytes: Number.isFinite(size) ? size : 0,
    lengthSeconds: parseArchiveLength(file.length),
  };
}

/** Prefer a compact lossy file, then fall back to the largest playable one. */
function pickPrimaryFile(files: ArchiveFile[]): ArchiveFile | null {
  if (files.length === 0) return null;
  const lossy = files.filter((file) => !LOSSLESS_FORMATS.has(file.format));
  const pool = lossy.length > 0 ? lossy : files;
  return pool.reduce((best, file) =>
    file.sizeBytes > 0 &&
    (best.sizeBytes === 0 || file.sizeBytes < best.sizeBytes)
      ? file
      : best,
  );
}

/** Fetch the playable audio files of one Archive item. */
export async function fetchArchiveFiles(
  identifier: string,
  signal?: AbortSignal,
): Promise<ArchiveFile[]> {
  const response = await fetch(
    `${METADATA_ENDPOINT}/${encodeURIComponent(identifier)}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error("Gagal memuat berkas dari Internet Archive.");
  }
  const data = (await response.json()) as MetadataResponse;
  const files = (data.files ?? [])
    .map(toArchiveFile)
    .filter((file): file is ArchiveFile => file !== null);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Search the Internet Archive for public-domain audio.
 * Uses the keyless advancedsearch.php endpoint.
 */
export async function searchArchive(
  query: string,
  signal?: AbortSignal,
): Promise<ArchiveItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams();
  params.set("q", `${trimmed} AND mediatype:(audio)`);
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "creator");
  params.append("fl[]", "year");
  params.append("fl[]", "description");
  params.append("fl[]", "downloads");
  params.append("sort[]", "downloads desc");
  params.set("rows", "24");
  params.set("page", "1");
  params.set("output", "json");

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error("Pencarian Internet Archive gagal. Coba lagi.");
  }
  const data = (await response.json()) as SearchResponse;
  const docs = data.response?.docs ?? [];

  const items = await Promise.all(
    docs.map(async (doc): Promise<ArchiveItem | null> => {
      const identifier = doc.identifier ?? "";
      if (!identifier) return null;
      try {
        const files = await fetchArchiveFiles(identifier, signal);
        if (files.length === 0) return null;
        return {
          identifier,
          title: firstText(doc.title) || identifier,
          creator: firstText(doc.creator) || "Domain publik",
          year: doc.year ? String(doc.year) : "",
          description: stripHtml(firstText(doc.description)),
          downloads: doc.downloads ?? 0,
          artworkUrl: archiveArtworkUrl(identifier),
          files,
        };
      } catch {
        return null;
      }
    }),
  );

  return items.filter((item): item is ArchiveItem => item !== null);
}

/** Turn one Archive item into a playable queue item. */
export function toArchiveTrack(item: ArchiveItem): PlayableTrack | null {
  const file = pickPrimaryFile(item.files);
  if (!file) return null;
  return {
    id: `archive:${item.identifier}/${file.name}`,
    title: item.title,
    artist: item.creator,
    src: archiveStreamUrl(item.identifier, file.name),
    durationSeconds: file.lengthSeconds,
    source: "archive",
    archiveIdentifier: item.identifier,
    artworkUrl: item.artworkUrl,
  };
}

/** Turn every playable file of an Archive item into queue items. */
export function toArchiveTracks(item: ArchiveItem): PlayableTrack[] {
  return item.files.map((file) => ({
    id: `archive:${item.identifier}/${file.name}`,
    title: item.files.length > 1 ? `${item.title} — ${file.name}` : item.title,
    artist: item.creator,
    src: archiveStreamUrl(item.identifier, file.name),
    durationSeconds: file.lengthSeconds,
    source: "archive" as const,
    archiveIdentifier: item.identifier,
    artworkUrl: item.artworkUrl,
  }));
}
