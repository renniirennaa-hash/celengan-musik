import {
  archiveArtworkUrl,
  archiveStreamUrl,
  parseArchiveLength,
  toArchiveTrack,
  toArchiveTracks,
} from "@/lib/archive";
import type { ArchiveItem } from "@/types/music";
import { describe, expect, it } from "vitest";

function makeItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    identifier: "jazz-archive",
    title: "Jazz Collection",
    creator: "Public Domain",
    year: "1925",
    description: "",
    downloads: 10,
    artworkUrl: archiveArtworkUrl("jazz-archive"),
    files: [
      {
        name: "track-a.mp3",
        format: "VBR MP3",
        sizeBytes: 3_000_000,
        lengthSeconds: 231,
      },
      {
        name: "track-b.flac",
        format: "Flac",
        sizeBytes: 30_000_000,
        lengthSeconds: 240,
      },
    ],
    ...overrides,
  };
}

describe("parseArchiveLength", () => {
  it("parses plain seconds, m:ss, and h:mm:ss", () => {
    expect(parseArchiveLength("231.42")).toBeCloseTo(231.42);
    expect(parseArchiveLength("3:51")).toBe(231);
    expect(parseArchiveLength("1:02:03")).toBe(3723);
  });

  it("returns 0 for missing or malformed values", () => {
    expect(parseArchiveLength(undefined)).toBe(0);
    expect(parseArchiveLength("")).toBe(0);
    expect(parseArchiveLength("not-a-time")).toBe(0);
    expect(parseArchiveLength("1:xx")).toBe(0);
  });
});

describe("archive URL builders", () => {
  it("encodes the identifier and each filename segment", () => {
    expect(archiveStreamUrl("my item", "disc 1/track one.mp3")).toBe(
      "https://archive.org/download/my%20item/disc%201/track%20one.mp3",
    );
  });

  it("builds the artwork URL from the identifier", () => {
    expect(archiveArtworkUrl("my item")).toBe(
      "https://archive.org/services/img/my%20item",
    );
  });
});

describe("toArchiveTrack", () => {
  it("prefers the smallest lossy file and builds a playable track", () => {
    const track = toArchiveTrack(makeItem());

    expect(track).not.toBeNull();
    expect(track).toMatchObject({
      id: "archive:jazz-archive/track-a.mp3",
      title: "Jazz Collection",
      artist: "Public Domain",
      source: "archive",
      archiveIdentifier: "jazz-archive",
      durationSeconds: 231,
    });
    expect(track?.src).toBe(
      "https://archive.org/download/jazz-archive/track-a.mp3",
    );
  });

  it("falls back to a lossless file when no lossy file exists", () => {
    const item = makeItem({
      files: [
        {
          name: "only.flac",
          format: "Flac",
          sizeBytes: 30_000_000,
          lengthSeconds: 240,
        },
      ],
    });

    expect(toArchiveTrack(item)?.id).toBe("archive:jazz-archive/only.flac");
  });

  it("returns null when the item has no playable files", () => {
    expect(toArchiveTrack(makeItem({ files: [] }))).toBeNull();
  });
});

describe("toArchiveTracks", () => {
  it("maps every file into a queue item", () => {
    const queue = toArchiveTracks(makeItem());

    expect(queue).toHaveLength(2);
    expect(queue.map((track) => track.id)).toEqual([
      "archive:jazz-archive/track-a.mp3",
      "archive:jazz-archive/track-b.flac",
    ]);
    expect(queue[0]?.source).toBe("archive");
  });
});
