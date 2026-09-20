import Common "common";
import Storage "mo:caffeineai-object-storage/Storage";

module {
  public type TrackId = Common.TrackId;
  public type Timestamp = Common.Timestamp;

  /// An uploaded audio track as stored internally.
  public type Track = {
    id : TrackId;
    title : Text;
    artist : Text;
    durationSeconds : Nat;
    contentType : Text;
    sizeBytes : Nat;
    blob : Storage.ExternalBlob;
    originalFilename : Text;
    createdAt : Timestamp;
  };

  /// An uploaded audio track as returned across the API boundary.
  public type TrackView = {
    id : TrackId;
    title : Text;
    artist : Text;
    durationSeconds : Nat;
    contentType : Text;
    sizeBytes : Nat;
    blob : Storage.ExternalBlob;
    originalFilename : Text;
    createdAt : Timestamp;
  };

  /// Input for registering an uploaded audio track.
  public type CreateTrackInput = {
    title : Text;
    artist : Text;
    durationSeconds : Nat;
    contentType : Text;
    sizeBytes : Nat;
    blob : Storage.ExternalBlob;
    originalFilename : Text;
  };

  /// Caller-visible failure modes for music operations.
  public type MusicError = {
    #trackNotFound : TrackId;
    #invalidInput : Text;
  };
};
