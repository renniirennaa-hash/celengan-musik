import Map "mo:core/Map";
import Types "../types/music";

module {
  public type Track = Types.Track;
  public type TrackView = Types.TrackView;
  public type CreateTrackInput = Types.CreateTrackInput;
  public type MusicError = Types.MusicError;

  /// Mutable counter shared with the API mixin.
  public type MusicState = {
    var nextTrackId : Nat;
  };

  /// Maximum accepted audio file size: 50 MB.
  let maxSizeBytes : Nat = 52428800;

  /// Audio content types accepted for upload.
  let allowedContentTypes : [Text] = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
  ];

  func isAllowedContentType(contentType : Text) : Bool {
    let normalized = contentType.toLower();
    allowedContentTypes.any(func(allowed) = allowed == normalized);
  };

  public func toTrackView(track : Track) : TrackView {
    {
      id = track.id;
      title = track.title;
      artist = track.artist;
      durationSeconds = track.durationSeconds;
      contentType = track.contentType;
      sizeBytes = track.sizeBytes;
      blob = track.blob;
      originalFilename = track.originalFilename;
      createdAt = track.createdAt;
    };
  };

  /// Validate the caller-supplied track metadata. Returns the first failure.
  public func validate(input : CreateTrackInput) : ?MusicError {
    if (input.title.trim(#char ' ').size() == 0) {
      return ?#invalidInput("Judul lagu tidak boleh kosong.");
    };
    if (not isAllowedContentType(input.contentType)) {
      return ?#invalidInput("Format file tidak didukung. Gunakan mp3, wav, ogg, atau m4a.");
    };
    if (input.sizeBytes == 0) {
      return ?#invalidInput("File audio kosong.");
    };
    if (input.sizeBytes > maxSizeBytes) {
      return ?#invalidInput("Ukuran file melebihi batas 50 MB.");
    };
    null;
  };

  public func createTrack(
    state : MusicState,
    tracks : Map.Map<Nat, Track>,
    input : CreateTrackInput,
    now : Int,
  ) : TrackView {
    let id = state.nextTrackId;
    state.nextTrackId := id + 1;
    let track : Track = {
      id;
      title = input.title;
      artist = input.artist;
      durationSeconds = input.durationSeconds;
      contentType = input.contentType;
      sizeBytes = input.sizeBytes;
      blob = input.blob;
      originalFilename = input.originalFilename;
      createdAt = now;
    };
    tracks.add(id, track);
    toTrackView(track);
  };

  public func listTracks(tracks : Map.Map<Nat, Track>) : [TrackView] {
    let all = tracks.values().toArray();
    let sorted = all.sort(func(a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
    sorted.map(func(track) = toTrackView(track));
  };

  public func getTrack(tracks : Map.Map<Nat, Track>, id : Nat) : ?TrackView {
    switch (tracks.get(id)) {
      case (?track) { ?toTrackView(track) };
      case null { null };
    };
  };

  public func deleteTrack(tracks : Map.Map<Nat, Track>, id : Nat) : Bool {
    switch (tracks.get(id)) {
      case null { false };
      case (?_) {
        tracks.remove(id);
        true;
      };
    };
  };
};
