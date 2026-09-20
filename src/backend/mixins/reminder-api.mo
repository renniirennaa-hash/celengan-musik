import AccessControl "mo:caffeineai-authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import ReminderLib "../lib/reminder";
import SavingsTypes "../types/savings";
import Types "../types/reminder";

mixin (
  accessControlState : AccessControl.AccessControlState,
  state : ReminderLib.ReminderState,
  goals : Map.Map<Nat, SavingsTypes.Goal>,
  deposits : List.List<SavingsTypes.Deposit>,
) {
  /// Reject any caller that is not an admin.
  func requireAdmin(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Akses ditolak: hanya admin yang dapat mengelola pengingat");
    };
  };

  /// Read the current reminder settings (admin only). Secrets are masked.
  public query ({ caller }) func getReminderSettings() : async Types.ReminderSettingsView {
    requireAdmin(caller);
    ReminderLib.getSettings(state);
  };

  /// Save the reminder settings (admin only).
  public shared ({ caller }) func saveReminderSettings(input : Types.SaveReminderSettingsInput) : async { #ok : Types.ReminderSettingsView; #err : Types.ReminderError } {
    requireAdmin(caller);
    ReminderLib.saveSettings(state, input);
  };

  /// Whether the reminder is fully configured (admin only).
  public query ({ caller }) func isReminderConfigured() : async Bool {
    requireAdmin(caller);
    ReminderLib.isConfigured(state);
  };

  /// Send the daily reminder SMS immediately (admin only).
  public shared ({ caller }) func sendReminderNow() : async Types.SendResult {
    requireAdmin(caller);
    await ReminderLib.sendReminderNow(state, { goals; deposits }, Time.now());
  };

  /// Read the last reminder send result (admin only).
  public query ({ caller }) func getLastReminderSend() : async ?Types.LastSendResult {
    requireAdmin(caller);
    ReminderLib.getLastSendResult(state);
  };
};
