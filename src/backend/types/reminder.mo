import Common "common";

module {
  public type Timestamp = Common.Timestamp;

  /// Reminder settings as returned across the API boundary.
  /// Secrets are never returned in full: only masked/boolean indicators.
  public type ReminderSettingsView = {
    /// Destination phone number in Indonesian format (+62...).
    phoneNumber : Text;
    /// Twilio sender number in E.164 format.
    senderNumber : Text;
    /// Whether the daily reminder is enabled.
    enabled : Bool;
    /// Whether an Account SID has been stored.
    accountSidSet : Bool;
    /// Whether an API Key SID has been stored.
    apiKeySidSet : Bool;
    /// Whether an API Key Secret has been stored.
    apiKeySecretSet : Bool;
    /// Masked Account SID for display, e.g. "AC••••1234".
    accountSidMasked : Text;
    /// Masked API Key SID for display, e.g. "SK••••1234".
    apiKeySidMasked : Text;
  };

  /// Input for saving the reminder settings.
  /// Empty secret fields mean "keep the stored value".
  public type SaveReminderSettingsInput = {
    phoneNumber : Text;
    senderNumber : Text;
    accountSid : Text;
    apiKeySid : Text;
    apiKeySecret : Text;
    enabled : Bool;
  };

  /// Caller-visible failure modes for reminder settings operations.
  public type ReminderError = {
    #invalidPhoneNumber : Text;
    #invalidSenderNumber : Text;
    #invalidCredentials : Text;
    #notConfigured;
    #sendFailed : Text;
  };

  /// Outcome of a reminder send attempt.
  public type SendResult = {
    timestamp : Timestamp;
    success : Bool;
    message : Text;
  };

  /// The last reminder send attempt, if any.
  public type LastSendResult = {
    timestamp : Timestamp;
    success : Bool;
    message : Text;
  };
};
