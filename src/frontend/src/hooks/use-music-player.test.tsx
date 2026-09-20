import {
  MusicPlayerProvider,
  formatPlaybackTime,
  useMusicPlayer,
} from "@/hooks/use-music-player";
import { FakeAudio } from "@/test/fake-audio";
import type { PlayableTrack } from "@/types/music";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track: PlayableTrack = {
  id: "archive:jazz/track-a.mp3",
  title: "Take Five",
  artist: "Dave Brubeck",
  src: "https://archive.org/download/jazz/track-a.mp3",
  durationSeconds: 324,
  source: "archive",
};

const other: PlayableTrack = {
  id: "archive:jazz/track-b.mp3",
  title: "Blue Rondo",
  artist: "Dave Brubeck",
  src: "https://archive.org/download/jazz/track-b.mp3",
  durationSeconds: 200,
  source: "archive",
};

/** Exposes the controller so each branch can be driven without a page. */
function Probe() {
  const player = useMusicPlayer();
  return (
    <div>
      <span data-ocid="probe.track">
        {player.currentTrack?.title ?? "none"}
      </span>
      <span data-ocid="probe.playing">{player.isPlaying ? "yes" : "no"}</span>
      <span data-ocid="probe.time">{player.currentTime}</span>
      <span data-ocid="probe.duration">{player.duration}</span>
      <span data-ocid="probe.queue">{player.queue.length}</span>
      <span data-ocid="probe.full">
        {player.isFullPlayerOpen ? "open" : "closed"}
      </span>
      <button type="button" onClick={() => player.play(track, [track, other])}>
        play
      </button>
      <button type="button" onClick={() => player.toggle()}>
        toggle
      </button>
      <button type="button" onClick={() => player.seek(42)}>
        seek
      </button>
      <button type="button" onClick={() => player.next()}>
        next
      </button>
      <button type="button" onClick={() => player.stop()}>
        stop
      </button>
      <button type="button" onClick={() => player.setFullPlayerOpen(true)}>
        expand
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <MusicPlayerProvider>
      <Probe />
    </MusicPlayerProvider>,
  );
}

beforeEach(() => {
  // jsdom does not implement media playback; the provider only needs an element
  // that accepts the calls and emits the events it listens for.
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useMusicPlayer", () => {
  it("throws a clear error when used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      "useMusicPlayer harus dipakai di dalam MusicPlayerProvider.",
    );
    spy.mockRestore();
  });

  it("loads a track with its queue and reports it as playing", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "play" }));

    expect(screen.getByTestId("probe.track")).toHaveTextContent("Take Five");
    expect(screen.getByTestId("probe.queue")).toHaveTextContent("2");
    // The declared duration is replaced once the media metadata loads, which is
    // the fake element's 180s.
    await waitFor(() =>
      expect(screen.getByTestId("probe.duration")).toHaveTextContent("180"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("probe.playing")).toHaveTextContent("yes"),
    );
  });

  it("toggles pause and resume for the current track", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "play" }));
    await waitFor(() =>
      expect(screen.getByTestId("probe.playing")).toHaveTextContent("yes"),
    );

    await user.click(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() =>
      expect(screen.getByTestId("probe.playing")).toHaveTextContent("no"),
    );

    await user.click(screen.getByRole("button", { name: "toggle" }));
    await waitFor(() =>
      expect(screen.getByTestId("probe.playing")).toHaveTextContent("yes"),
    );
  });

  it("seeks to an absolute position", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "play" }));
    await user.click(screen.getByRole("button", { name: "seek" }));

    expect(screen.getByTestId("probe.time")).toHaveTextContent("42");
  });

  it("advances to the next track in the queue", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "play" }));
    await user.click(screen.getByRole("button", { name: "next" }));

    expect(screen.getByTestId("probe.track")).toHaveTextContent("Blue Rondo");
  });

  it("stops playback, clears the track, and closes the full player", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "play" }));
    await user.click(screen.getByRole("button", { name: "expand" }));
    expect(screen.getByTestId("probe.full")).toHaveTextContent("open");

    await user.click(screen.getByRole("button", { name: "stop" }));

    expect(screen.getByTestId("probe.track")).toHaveTextContent("none");
    expect(screen.getByTestId("probe.playing")).toHaveTextContent("no");
    expect(screen.getByTestId("probe.queue")).toHaveTextContent("0");
    expect(screen.getByTestId("probe.full")).toHaveTextContent("closed");
  });
});

describe("formatPlaybackTime", () => {
  it("formats seconds as m:ss and h:mm:ss", () => {
    expect(formatPlaybackTime(0)).toBe("0:00");
    expect(formatPlaybackTime(65)).toBe("1:05");
    expect(formatPlaybackTime(3723)).toBe("1:02:03");
  });

  it("clamps invalid input to 0:00", () => {
    expect(formatPlaybackTime(Number.NaN)).toBe("0:00");
    expect(formatPlaybackTime(-5)).toBe("0:00");
  });
});
