import {
  tracksKey,
  useCreateTrack,
  useDeleteTrack,
  useTracks,
} from "@/hooks/use-tracks";
import { createMockActor, makeTrack } from "@/test/fixtures";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The tracks hooks are the frontend/backend consumer seam for the upload and
// delete flows. The actor is a typed local mock, so this pins the calls and the
// cache invalidation the page relies on without touching a live canister.
const actor = createMockActor();

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
}));

function TracksHarness() {
  const tracks = useTracks();
  const createTrack = useCreateTrack();
  const deleteTrack = useDeleteTrack();
  return (
    <div>
      <span data-ocid="harness.tracks">
        {tracks.data?.map((track) => track.title).join(",") ?? "none"}
      </span>
      <button
        type="button"
        onClick={() =>
          createTrack.mutate(
            {
              title: "lagu baru",
              artist: "Unggahan saya",
              durationSeconds: 10n,
              contentType: "audio/mpeg",
              sizeBytes: 100n,
              blob: makeTrack().blob,
              originalFilename: "lagu baru.mp3",
            },
            { onError: () => {} },
          )
        }
      >
        create
      </button>
      <button
        type="button"
        onClick={() => deleteTrack.mutate(7n, { onError: () => {} })}
      >
        delete
      </button>
    </div>
  );
}

function renderHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <TracksHarness />
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  actor.listTracks.mockResolvedValue([]);
  actor.createTrack.mockResolvedValue(makeTrack());
  actor.deleteTrack.mockResolvedValue(true);
});

describe("useTracks", () => {
  it("lists the uploaded tracks through the actor", async () => {
    actor.listTracks.mockResolvedValue([
      makeTrack({ id: 1n, title: "lagu satu" }),
      makeTrack({ id: 2n, title: "lagu dua" }),
    ]);
    renderHarness();

    expect(await screen.findByText("lagu satu,lagu dua")).toBeInTheDocument();
    expect(actor.listTracks).toHaveBeenCalled();
  });
});

describe("useCreateTrack", () => {
  it("forwards the upload input to the actor and refetches the list", async () => {
    actor.listTracks
      .mockResolvedValueOnce([])
      .mockResolvedValue([makeTrack({ id: 7n, title: "lagu baru" })]);
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole("button", { name: "create" }));

    await waitFor(() =>
      expect(actor.createTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "lagu baru",
          artist: "Unggahan saya",
          contentType: "audio/mpeg",
        }),
      ),
    );
    expect(await screen.findByText("lagu baru")).toBeInTheDocument();
  });
});

describe("useDeleteTrack", () => {
  it("deletes by id and invalidates the tracks query", async () => {
    const { queryClient } = renderHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "delete" }));

    await waitFor(() => expect(actor.deleteTrack).toHaveBeenCalledWith(7n));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: tracksKey }),
    );
  });
});
