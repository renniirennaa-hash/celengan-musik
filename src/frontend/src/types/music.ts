import type { TrackView } from "@/backend";

export type { TrackView };

/** Where a playable track came from. */
export type TrackSource = "archive" | "upload";

/**
 * One playable item in the player queue. Archive results and uploaded tracks
 * both collapse into this shape so the player never branches on origin.
 */
export interface PlayableTrack {
  /** Stable identity, unique across sources (e.g. "archive:identifier/file"). */
  id: string;
  title: string;
  artist: string;
  /** Playable stream URL. */
  src: string;
  /** Duration in seconds when known; 0 when the source does not report it. */
  durationSeconds: number;
  source: TrackSource;
  /** Internet Archive identifier, present for archive tracks. */
  archiveIdentifier?: string;
  /** Backend track id, present for uploaded tracks. */
  trackId?: bigint;
  /** Cover art URL when the source provides one. */
  artworkUrl?: string;
}

/** A single audio file inside an Internet Archive item. */
export interface ArchiveFile {
  name: string;
  format: string;
  sizeBytes: number;
  lengthSeconds: number;
}

/** An Internet Archive item with its playable audio files resolved. */
export interface ArchiveItem {
  identifier: string;
  title: string;
  creator: string;
  year: string;
  description: string;
  downloads: number;
  artworkUrl?: string;
  files: ArchiveFile[];
}

/** Convert an uploaded backend track into a playable queue item. */
export function toPlayableTrack(track: TrackView): PlayableTrack {
  return {
    id: `upload:${track.id.toString()}`,
    title: track.title,
    artist: track.artist,
    src: track.blob.getDirectURL(),
    durationSeconds: Number(track.durationSeconds),
    source: "upload",
    trackId: track.id,
  };
}
