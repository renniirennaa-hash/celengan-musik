import Error "mo:core/Error";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import { createMessage } "mo:twilio-client/Apis/Api20100401MessageApi";
import { defaultConfig; type Config } "mo:twilio-client/Config";
import SavingsLib "savings";
import SavingsTypes "../types/savings";
import Types "../types/reminder";

module {
  /// Mutable state for the reminder settings and SMS sending domain.
  public type ReminderState = {
    var phoneNumber : Text;
    var senderNumber : Text;
    var accountSid : Text;
    var apiKeySid : Text;
    var apiKeySecret : Text;
    var enabled : Bool;
    var lastSendTimestamp : Int;
    var lastSendSuccess : Bool;
    var lastSendMessage : Text;
  };

  /// The savings data the reminder message summarises.
  public type SavingsContext = {
    goals : Map.Map<Nat, SavingsTypes.Goal>;
    deposits : List.List<SavingsTypes.Deposit>;
  };

  /// Nanoseconds in one day.
  let nanosecondsPerDay : Nat = 86_400_000_000_000;

  /// Nanoseconds from the Unix epoch to 12:00 UTC (19:00 WIB).
  let dailySendOffset : Nat = 43_200_000_000_000;

  /// Delay in nanoseconds from `now` to the next 12:00 UTC boundary.
  /// `now` is nanoseconds since the Unix epoch and is never negative here.
  public func delayToNextDailySend(now : Int) : Nat {
    let nowNat = if (now < 0) { 0 } else { now.toNat() };
    // Time elapsed since the most recent 12:00 UTC boundary, in `[0, day)`.
    // `dailySendOffset` is added first so the subtraction can never underflow.
    let sinceBoundary = (nowNat + dailySendOffset) % nanosecondsPerDay;
    // `sinceBoundary < nanosecondsPerDay`, so the remainder is in `(0, day]`.
    nanosecondsPerDay - sinceBoundary;
  };

  /// Mask a secret for display: keep the last 4 characters, hide the rest.
  /// Short values are hidden entirely.
  func mask(value : Text) : Text {
    let size = value.size();
    if (size == 0) {
      "";
    } else if (size <= 4) {
      "••••";
    } else {
      // `size > 4` here, so the subtraction is safe.
      let keep = size - 4 : Nat;
      "••••" # Text.fromIter(value.chars().drop(keep));
    };
  };

  /// Read the current reminder settings as a secret-free view.
  public func getSettings(state : ReminderState) : Types.ReminderSettingsView {
    {
      phoneNumber = state.phoneNumber;
      senderNumber = state.senderNumber;
      enabled = state.enabled;
      accountSidSet = state.accountSid.size() > 0;
      apiKeySidSet = state.apiKeySid.size() > 0;
      apiKeySecretSet = state.apiKeySecret.size() > 0;
      accountSidMasked = mask(state.accountSid);
      apiKeySidMasked = mask(state.apiKeySid);
    };
  };

  /// A destination number must be Indonesian: `+62` followed by at least one digit.
  func isValidIndonesianNumber(value : Text) : Bool {
    let trimmed = value.trim(#char ' ');
    if (not trimmed.startsWith(#text "+62")) {
      return false;
    };
    let rest = Text.fromIter(trimmed.chars().drop(3));
    rest.size() > 0 and rest.chars().all(func(c) = c >= '0' and c <= '9');
  };

  /// A sender number must be E.164: `+` followed by digits.
  func isValidSenderNumber(value : Text) : Bool {
    let trimmed = value.trim(#char ' ');
    if (not trimmed.startsWith(#text "+")) {
      return false;
    };
    let rest = Text.fromIter(trimmed.chars().drop(1));
    rest.size() > 0 and rest.chars().all(func(c) = c >= '0' and c <= '9');
  };

  /// Persist the reminder settings, validating the phone number and credentials.
  /// Blank secret fields keep the previously stored value.
  public func saveSettings(state : ReminderState, input : Types.SaveReminderSettingsInput) : { #ok : Types.ReminderSettingsView; #err : Types.ReminderError } {
    let phoneNumber = input.phoneNumber.trim(#char ' ');
    if (not isValidIndonesianNumber(phoneNumber)) {
      return #err(#invalidPhoneNumber("Nomor HP harus dalam format Indonesia, contoh +628123456789"));
    };
    let senderNumber = input.senderNumber.trim(#char ' ');
    if (not isValidSenderNumber(senderNumber)) {
      return #err(#invalidSenderNumber("Nomor pengirim harus dalam format internasional, contoh +15551234567"));
    };

    let accountSid = input.accountSid.trim(#char ' ');
    let apiKeySid = input.apiKeySid.trim(#char ' ');
    let apiKeySecret = input.apiKeySecret.trim(#char ' ');

    // Blank means "keep the stored value"; a supplied value must look right.
    if (accountSid.size() > 0 and not accountSid.startsWith(#text "AC")) {
      return #err(#invalidCredentials("Account SID harus diawali 'AC'"));
    };
    if (apiKeySid.size() > 0 and not apiKeySid.startsWith(#text "SK")) {
      return #err(#invalidCredentials("API Key SID harus diawali 'SK'"));
    };

    state.phoneNumber := phoneNumber;
    state.senderNumber := senderNumber;
    state.enabled := input.enabled;
    if (accountSid.size() > 0) { state.accountSid := accountSid };
    if (apiKeySid.size() > 0) { state.apiKeySid := apiKeySid };
    if (apiKeySecret.size() > 0) { state.apiKeySecret := apiKeySecret };

    #ok(getSettings(state));
  };

  /// Whether all required Twilio credentials and the sender number are present.
  public func isConfigured(state : ReminderState) : Bool {
    state.phoneNumber.size() > 0
    and state.senderNumber.size() > 0
    and state.accountSid.size() > 0
    and state.apiKeySid.size() > 0
    and state.apiKeySecret.size() > 0;
  };

  /// Credentials ride `config.auth`; `defaultConfig` is already non-replicated,
  /// which is required because an SMS send is not idempotent.
  func twilioConfig(state : ReminderState) : Config {
    {
      defaultConfig with
      auth = ?#basicAuth { user = state.apiKeySid; password = state.apiKeySecret };
      max_response_bytes = ?(200_000 : Nat64);
    };
  };

  /// A short Indonesian summary of the active goal's progress, or a generic
  /// invitation when no goal exists yet.
  func progressSummary(context : SavingsContext) : Text {
    let goals = context.goals.values().toArray();
    if (goals.size() == 0) {
      return "Belum ada target tabungan. Yuk mulai catat setoran pertamamu hari ini!";
    };
    let sorted = goals.sort(func(a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
    let goal = sorted[0];
    var total = 0;
    for (deposit in context.deposits.values()) {
      if (deposit.goalId == goal.id) {
        total += deposit.amount;
      };
    };
    let percentage = if (goal.targetAmount == 0) {
      100;
    } else {
      let raw = total * 100 / goal.targetAmount;
      if (raw > 100) { 100 } else { raw };
    };
    "Target \"" # goal.name # "\" sudah " # percentage.toText() # "% tercapai (Rp" # total.toText() # " dari Rp" # goal.targetAmount.toText() # ").";
  };

  /// Compose the Indonesian reminder message.
  func buildMessage(context : SavingsContext) : Text {
    "Halo! Ini pengingat dari Celengan Musik. Jangan lupa catat setoran tabunganmu hari ini ya. " # progressSummary(context) # " Semangat menabung!";
  };

  /// Send the daily reminder SMS now and record the outcome.
  /// A failed send never traps: it is recorded and returned as `success = false`.
  public func sendReminderNow(state : ReminderState, context : SavingsContext, now : Int) : async Types.SendResult {
    if (not isConfigured(state)) {
      let message = "Pengingat belum dikonfigurasi. Lengkapi nomor HP dan kredensial Twilio terlebih dahulu.";
      state.lastSendTimestamp := now;
      state.lastSendSuccess := false;
      state.lastSendMessage := message;
      return { timestamp = now; success = false; message };
    };

    let body = buildMessage(context);
    let result : Types.SendResult = try {
      let msg = await* createMessage(
        twilioConfig(state),
        state.accountSid, // accountSid — in the URL path, not the credential
        state.phoneNumber, // to (E.164)
        "", "", // statusCallback, applicationSid
        0.0, // maxPrice (0 = no cap)
        false, // provideFeedback
        0, 0, // attempt, validityPeriod
        false, // forceDelivery
        null, null, // contentRetention, addressRetention (omitted)
        false, // smartEncoded
        [], // persistentAction
        null, // trafficType (omitted)
        false, // shortenUrls
        null, // scheduleType — MUST be null for an immediate send
        "", // sendAt (scheduled sends only)
        false, // sendAsMms
        "", // contentVariables
        null, // riskCheck (omitted)
        state.senderNumber, // from
        "", // fallbackFrom
        "", // messagingServiceSid
        body, // body
        [], // mediaUrl (set for MMS)
        "", // contentSid (Content API templates)
      );
      let sid = msg.sid ?? "";
      { timestamp = now; success = true; message = "Pengingat terkirim (SID: " # sid # ")" };
    } catch (e) {
      { timestamp = now; success = false; message = "Gagal mengirim pengingat: " # e.message() };
    };

    state.lastSendTimestamp := result.timestamp;
    state.lastSendSuccess := result.success;
    state.lastSendMessage := result.message;
    result;
  };

  /// Read the last reminder send result, if any.
  public func getLastSendResult(state : ReminderState) : ?Types.LastSendResult {
    if (state.lastSendTimestamp == 0 and state.lastSendMessage.size() == 0) {
      return null;
    };
    ?{
      timestamp = state.lastSendTimestamp;
      success = state.lastSendSuccess;
      message = state.lastSendMessage;
    };
  };
};
