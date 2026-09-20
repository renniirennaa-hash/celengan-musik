import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import MusicLib "../lib/music";
import Types "../types/music";

mixin (
  state : MusicLib.MusicState,
  tracks : Map.Map<Nat, Types.Track>,
) {
  /// Register an uploaded audio track in the shared library.
  public shared ({ caller }) func createTrack(input : Types.CreateTrackInput) : async Types.TrackView {
    ignore caller;
    switch (MusicLib.validate(input)) {
      case (?#invalidInput(message)) { Runtime.trap(message) };
      case _ {};
    };
    MusicLib.createTrack(state, tracks, input, Time.now());
  };

  /// List every uploaded audio track, newest first.
  public query ({ caller }) func listTracks() : async [Types.TrackView] {
    ignore caller;
    MusicLib.listTracks(tracks);
  };

  /// Fetch a single uploaded audio track.
  public query ({ caller }) func getTrack(id : Nat) : async ?Types.TrackView {
    ignore caller;
    MusicLib.getTrack(tracks, id);
  };

  /// Delete an uploaded audio track.
  public shared ({ caller }) func deleteTrack(id : Nat) : async Bool {
    ignore caller;
    MusicLib.deleteTrack(tracks, id);
  };
};
