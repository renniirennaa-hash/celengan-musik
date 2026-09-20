module {
  /// Identifier for a savings goal.
  public type GoalId = Nat;

  /// Identifier for a deposit.
  public type DepositId = Nat;

  /// Identifier for an uploaded music track.
  public type TrackId = Nat;

  /// Wall-clock timestamp in nanoseconds since the Unix epoch.
  public type Timestamp = Int;

  /// A calendar date encoded as a `YYYY-MM-DD` text value.
  public type DateText = Text;

  /// Monetary amount in whole Indonesian Rupiah.
  public type Rupiah = Nat;
};
