import { createActor } from "@/backend";
import type {
  LastSendResult,
  ReminderError,
  ReminderSettingsView,
  SaveReminderSettingsInput,
  SendResult,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type {
  LastSendResult,
  ReminderError,
  ReminderSettingsView,
  SaveReminderSettingsInput,
  SendResult,
};

export const reminderSettingsKey = ["reminder", "settings"] as const;
export const reminderConfiguredKey = ["reminder", "configured"] as const;
export const reminderLastSendKey = ["reminder", "last-send"] as const;

/** Read the current reminder settings (admin only). Secrets come back masked. */
export function useReminderSettings(enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ReminderSettingsView>({
    queryKey: reminderSettingsKey,
    queryFn: async () => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.getReminderSettings();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: false,
  });
}

/** Whether the reminder is fully configured (admin only). */
export function useIsReminderConfigured(enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: reminderConfiguredKey,
    queryFn: async () => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.isReminderConfigured();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: false,
  });
}

/** Read the last reminder send result (admin only). */
export function useLastReminderSend(enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<LastSendResult | null>({
    queryKey: reminderLastSendKey,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getLastReminderSend();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: false,
  });
}

/** Save the reminder settings (admin only). */
export function useSaveReminderSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<ReminderSettingsView, Error, SaveReminderSettingsInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend belum siap.");
      const result = await actor.saveReminderSettings(input);
      if (result.__kind__ === "err") {
        throw new Error(describeReminderError(result.err));
      }
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reminderSettingsKey });
      void queryClient.invalidateQueries({ queryKey: reminderConfiguredKey });
    },
  });
}

/** Send the daily reminder SMS immediately (admin only). */
export function useSendReminderNow() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<SendResult, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend belum siap.");
      return actor.sendReminderNow();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reminderLastSendKey });
      void queryClient.invalidateQueries({ queryKey: reminderConfiguredKey });
    },
  });
}

/** Human-readable Indonesian message for a backend reminder error. */
export function describeReminderError(error: ReminderError): string {
  switch (error.__kind__) {
    case "invalidPhoneNumber":
      return error.invalidPhoneNumber;
    case "invalidSenderNumber":
      return error.invalidSenderNumber;
    case "invalidCredentials":
      return error.invalidCredentials;
    case "notConfigured":
      return "Pengingat belum dikonfigurasi.";
    case "sendFailed":
      return error.sendFailed;
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}
