import { MiniPlayer } from "@/components/MiniPlayer";
import { MusicPlayerProvider } from "@/hooks/use-music-player";
import { MusikPage } from "@/pages/MusikPage";
import { FakeAudio } from "@/test/fake-audio";
import { createMockActor, makeTrack } from "@/test/fixtures";
import type { ArchiveItem } from "@/types/music";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

// The upload path builds an ExternalBlob and reports progress through it. The
// real class talks to object storage; this stand-in keeps the call local and
// lets the test drive the progress callback. It is self-contained because
// `vi.mock` factories are hoisted above the module's imports.
const uploadProgress = vi.hoisted(() => ({
  emit: undefined as undefined | ((percentage: number) => void),
}));

vi.mock("@caffeineai/object-storage", () => {
  const blob = {
    getDirectURL: () => "https://example.test/audio.mp3",
    withUploadProgress: (callback: (percentage: number) => void) => {
      uploadProgress.emit = callback;
      return blob;
    },
  };
  return { ExternalBlob: { fromBytes: () => blob } };
});

// Internet Archive is an external network dependency; the page's own contract
// is what is under test, so the search adapter is replaced with a local stub.
const searchArchive = vi.hoisted(() => vi.fn());
vi.mock("@/lib/archive", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/archive")>();
  return { ...actual, searchArchive };
});

const archiveItem: ArchiveItem = {
  identifier: "jazz-archive",
  title: "Jazz Collection",
  creator: "Public Domain Ensemble",
  year: "1925",
  description: "",
  downloads: 10,
  artworkUrl: "https://archive.org/services/img/jazz-archive",
  files: [
    {
      name: "track-a.mp3",
      format: "VBR MP3",
      sizeBytes: 3_000_000,
      lengthSeconds: 231,
    },
  ],
};

/**
 * An audio element whose metadata never loads and whose `error` never fires —
 * the "codec the browser cannot decode / probe that never settles" case. The
 * upload path must still finish instead of hanging on the duration probe.
 */
class NeverSettlingAudio {
  currentTime = 0;
  duration = Number.NaN;
  volume = 1;
  preload = "";
  paused = true;
  private source = "";

  get src(): string {
    return this.source;
  }

  set src(value: string) {
    this.source = value;
  }

  addEventListener() {}
  removeEventListener() {}
  removeAttribute() {
    this.source = "";
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MusicPlayerProvider>
        <MusikPage />
        {/* The shell mounts the persistent player; rendering it here lets the
            page's play actions be observed through the real mini-player. */}
        <MiniPlayer />
      </MusicPlayerProvider>
    </QueryClientProvider>,
  );
}

/** Drive the hidden file input directly; `user.upload` honours `accept`. */
function chooseFile(file: File) {
  fireEvent.change(screen.getByTestId("musik.file_input"), {
    target: { files: [file] },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadProgress.emit = undefined;
  actor.listTracks.mockResolvedValue([]);
  actor.createTrack.mockResolvedValue(makeTrack());
  actor.deleteTrack.mockResolvedValue(true);
  searchArchive.mockResolvedValue([]);
  vi.stubGlobal("Audio", FakeAudio);
  // jsdom has no object-URL support; the upload path only needs a stable URL.
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:fake-audio"),
    revokeObjectURL: vi.fn(),
  });
  // jsdom's Blob predates `arrayBuffer()`; the upload path reads the file bytes
  // through it. This is a test-environment shim, not application behavior.
  if (typeof Blob.prototype.arrayBuffer !== "function") {
    Object.defineProperty(Blob.prototype, "arrayBuffer", {
      configurable: true,
      writable: true,
      value(this: Blob) {
        return Promise.resolve(new Uint8Array([1, 2, 3]).buffer);
      },
    });
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MusikPage empty states", () => {
  it("shows the search prompt and the empty upload list before any action", async () => {
    renderPage();

    expect(screen.getByText("Belum ada pencarian")).toBeInTheDocument();
    expect(await screen.findByText("Belum ada lagu")).toBeInTheDocument();
  });
});

describe("MusikPage search", () => {
  it("shows a loading state, then renders results with title, creator, and duration", async () => {
    let resolveSearch: (items: ArchiveItem[]) => void = () => {};
    searchArchive.mockImplementation(
      () =>
        new Promise<ArchiveItem[]>((resolve) => {
          resolveSearch = resolve;
        }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText("Kata kunci pencarian musik"),
      "jazz",
    );
    await user.click(screen.getByRole("button", { name: "Cari" }));

    expect(
      screen.getByText("Mencari di Internet Archive…"),
    ).toBeInTheDocument();

    resolveSearch([archiveItem]);

    const list = await screen.findByTestId("musik.search_list");
    expect(within(list).getByText("Jazz Collection")).toBeInTheDocument();
    expect(
      within(list).getByText("Public Domain Ensemble"),
    ).toBeInTheDocument();
    expect(within(list).getByText("3:51")).toBeInTheDocument();
    expect(searchArchive).toHaveBeenCalledWith("jazz");
  });

  it("shows a clear no-results message when the search returns nothing", async () => {
    searchArchive.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Kata kunci pencarian musik"), "zzz");
    await user.click(screen.getByRole("button", { name: "Cari" }));

    expect(await screen.findByText("Tidak ada hasil")).toBeInTheDocument();
  });

  it("surfaces a search failure instead of an empty list", async () => {
    searchArchive.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText("Kata kunci pencarian musik"),
      "jazz",
    );
    await user.click(screen.getByRole("button", { name: "Cari" }));

    expect(
      await screen.findByText(
        "Pencarian gagal. Periksa koneksi lalu coba lagi.",
      ),
    ).toBeInTheDocument();
  });

  it("plays a search result in the persistent mini-player", async () => {
    searchArchive.mockResolvedValue([archiveItem]);
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText("Kata kunci pencarian musik"),
      "jazz",
    );
    await user.click(screen.getByRole("button", { name: "Cari" }));
    await screen.findByTestId("musik.search_list");

    await user.click(
      screen.getByRole("button", { name: "Putar Jazz Collection" }),
    );

    const miniPlayer = await screen.findByTestId("player.mini_player");
    expect(within(miniPlayer).getByText("Jazz Collection")).toBeInTheDocument();
    expect(
      within(miniPlayer).getByRole("button", { name: "Jeda lagu" }),
    ).toBeInTheDocument();
  });
});

describe("MusikPage uploads", () => {
  it("rejects an unsupported file type with a clear message", async () => {
    renderPage();

    chooseFile(new File(["x"], "notes.txt", { type: "text/plain" }));

    expect(
      await screen.findByText(
        "Format tidak didukung. Gunakan berkas MP3, WAV, OGG, atau M4A.",
      ),
    ).toBeInTheDocument();
    expect(actor.createTrack).not.toHaveBeenCalled();
  });

  it("rejects a file over the size cap with a clear message", async () => {
    renderPage();

    const big = new File([new Uint8Array(26 * 1024 * 1024)], "big.mp3", {
      type: "audio/mpeg",
    });
    chooseFile(big);

    expect(
      await screen.findByText("Ukuran berkas melebihi batas 25.0 MB."),
    ).toBeInTheDocument();
    expect(actor.createTrack).not.toHaveBeenCalled();
  });

  it("uploads an accepted file, shows progress, and lists it under Musik Saya", async () => {
    // The first read is empty; the refetch after the mutation returns the track.
    actor.listTracks
      .mockResolvedValueOnce([])
      .mockResolvedValue([makeTrack({ id: 7n, title: "lagu saya" })]);

    // Hold the mutation open so the progress indicator is observable.
    let finishUpload: (track: ReturnType<typeof makeTrack>) => void = () => {};
    actor.createTrack.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishUpload = resolve;
        }),
    );

    renderPage();
    chooseFile(
      new File(["audio-bytes"], "lagu saya.mp3", { type: "audio/mpeg" }),
    );

    expect(
      await screen.findByTestId("musik.upload_progress"),
    ).toBeInTheDocument();
    expect(actor.createTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "lagu saya",
        artist: "Unggahan saya",
        contentType: "audio/mpeg",
      }),
    );

    finishUpload(makeTrack({ id: 7n, title: "lagu saya" }));

    expect(await screen.findByText("lagu saya")).toBeInTheDocument();
  });

  // The backend validates `contentType` against a strict allowlist and traps on
  // anything else. Browsers report OS-specific MIME strings for the same file,
  // so the page must normalize from the extension before calling createTrack.
  it.each([
    ["audio/mpeg3", "lagu.mp3", "audio/mpeg"],
    ["audio/vnd.wave", "lagu.wav", "audio/wav"],
    ["audio/opus", "lagu.ogg", "audio/ogg"],
    ["audio/x-m4a", "lagu.m4a", "audio/mp4"],
  ])(
    "normalizes an OS-reported %s to a backend-allowlisted content type",
    async (reportedType, filename, expectedType) => {
      renderPage();

      chooseFile(new File(["audio-bytes"], filename, { type: reportedType }));

      await waitFor(() =>
        expect(actor.createTrack).toHaveBeenCalledWith(
          expect.objectContaining({ contentType: expectedType }),
        ),
      );
    },
  );

  it("does not hang the upload when the duration probe never settles", async () => {
    vi.stubGlobal("Audio", NeverSettlingAudio);
    vi.useFakeTimers();
    try {
      renderPage();

      chooseFile(new File(["audio-bytes"], "lagu.mp3", { type: "audio/mpeg" }));

      // The probe is bounded: advancing past its 5s timeout must let the
      // upload proceed with a zero duration rather than waiting forever.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(actor.createTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: "audio/mpeg",
          durationSeconds: 0n,
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes an uploaded track only after confirmation", async () => {
    actor.listTracks.mockResolvedValue([
      makeTrack({ id: 7n, title: "lagu saya" }),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Hapus lagu saya" }),
    );

    expect(actor.deleteTrack).not.toHaveBeenCalled();
    expect(screen.getByText("Hapus lagu ini?")).toBeInTheDocument();

    await user.click(screen.getByTestId("musik.delete.confirm_button"));

    await waitFor(() => expect(actor.deleteTrack).toHaveBeenCalledWith(7n));
  });

  it("keeps the track when the delete confirmation is cancelled", async () => {
    actor.listTracks.mockResolvedValue([
      makeTrack({ id: 7n, title: "lagu saya" }),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Hapus lagu saya" }),
    );
    await user.click(screen.getByTestId("musik.delete.cancel_button"));

    await waitFor(() =>
      expect(screen.queryByText("Hapus lagu ini?")).not.toBeInTheDocument(),
    );
    expect(actor.deleteTrack).not.toHaveBeenCalled();
    expect(screen.getByText("lagu saya")).toBeInTheDocument();
  });

  it("surfaces an upload failure and clears the progress indicator", async () => {
    actor.createTrack.mockRejectedValue(new Error("storage down"));
    renderPage();

    chooseFile(
      new File(["audio-bytes"], "lagu saya.mp3", { type: "audio/mpeg" }),
    );

    expect(
      await screen.findByText("Unggahan gagal. Coba lagi."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("musik.upload_progress"),
    ).not.toBeInTheDocument();
  });

  it("plays an uploaded track in the persistent mini-player", async () => {
    actor.listTracks.mockResolvedValue([
      makeTrack({ id: 7n, title: "lagu saya" }),
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Putar lagu saya" }),
    );

    const miniPlayer = await screen.findByTestId("player.mini_player");
    expect(within(miniPlayer).getByText("lagu saya")).toBeInTheDocument();
    expect(
      within(miniPlayer).getByRole("button", { name: "Jeda lagu" }),
    ).toBeInTheDocument();
  });
});
