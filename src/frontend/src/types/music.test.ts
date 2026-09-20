import { makeTrack } from "@/test/fixtures";
import { toPlayableTrack } from "@/types/music";
import { describe, expect, it } from "vitest";

// `toPlayableTrack` is the seam that turns a backend `TrackView` into a queue
// item the player can load. Uploaded-track playback depends on it, so its
// mapping is characterized here independently of the page that calls it.
describe("toPlayableTrack", () => {
  it("maps an uploaded track onto a playable queue item", () => {
    const track = makeTrack({
      id: 7n,
      title: "lagu saya",
      artist: "Unggahan saya",
      durationSeconds: 231n,
    });

    const playable = toPlayableTrack(track);

    expect(playable).toMatchObject({
      id: "upload:7",
      title: "lagu saya",
      artist: "Unggahan saya",
      durationSeconds: 231,
      source: "upload",
      trackId: 7n,
    });
  });

  it("uses the blob's direct URL as the playable source", () => {
    const track = makeTrack({
      blob: {
        getDirectURL: () => "https://gateway.test/blob/abc",
      } as unknown as ReturnType<typeof makeTrack>["blob"],
    });

    expect(toPlayableTrack(track).src).toBe("https://gateway.test/blob/abc");
  });

  it("keeps ids unique per backend track id", () => {
    expect(toPlayableTrack(makeTrack({ id: 1n })).id).not.toBe(
      toPlayableTrack(makeTrack({ id: 2n })).id,
    );
  });
});
