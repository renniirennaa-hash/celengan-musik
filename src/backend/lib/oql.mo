import OQL "mo:caffeineai-oql";
import Types "mo:caffeineai-oql/Types";

module {
  /// Render an optional text field as a single `Value` variant: a present
  /// value becomes `#text`, an absent one the empty-string sentinel. Always
  /// returning one variant keeps the reported schema type stable across rows.
  public func optTextToValue(value : ?Text) : Types.Value =
    switch (value) {
      case (?text) { #text text };
      case null { #text "" };
    };

  /// Render a `?Text` field as a `Value` for OQL auto-derivation.
  public func _toRow(self : ?Text) : Types.Value = optTextToValue(self);

  /// The OQL `Value` type, re-exported so callers need one import.
  public type Value = OQL.Value;
};
