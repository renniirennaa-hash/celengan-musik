import { createActor } from "@/backend";
import type { CreateTrackInput, TrackView } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const tracksKey = ["tracks"] as const;

/** List every uploaded audio track, newest first. */
export function useTracks() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TrackView[]>({
    queryKey: tracksKey,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTracks();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Register an uploaded audio track in the shared library. */
export function useCreateTrack() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<TrackView, Error, CreateTrackInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.createTrack(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tracksKey });
    },
  });
}

/** Delete an uploaded audio track. */
export function useDeleteTrack() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.deleteTrack(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tracksKey });
    },
  });
}
