import AccessControl "mo:caffeineai-authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Storage "mo:caffeineai-object-storage/Storage";

module {
  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    savingsState : SavingsState;
    goals : Map.Map<Nat, Goal>;
    deposits : List.List<Deposit>;
  };

  type SavingsState = {
    var nextGoalId : Nat;
    var nextDepositId : Nat;
  };

  type Goal = {
    id : Nat;
    name : Text;
    photoUrl : Text;
    targetAmount : Nat;
    startDate : Text;
    targetDate : Text;
    createdAt : Int;
  };

  type Deposit = {
    id : Nat;
    goalId : Nat;
    amount : Nat;
    date : Text;
    note : ?Text;
    createdAt : Int;
  };

  type MusicState = {
    var nextTrackId : Nat;
  };

  type Track = {
    id : Nat;
    title : Text;
    artist : Text;
    durationSeconds : Nat;
    contentType : Text;
    sizeBytes : Nat;
    blob : Storage.ExternalBlob;
    originalFilename : Text;
    createdAt : Int;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    savingsState : SavingsState;
    goals : Map.Map<Nat, Goal>;
    deposits : List.List<Deposit>;
    musicState : MusicState;
    tracks : Map.Map<Nat, Track>;
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      savingsState = old.savingsState;
      goals = old.goals;
      deposits = old.deposits;
      musicState = { var nextTrackId = 0 };
      tracks = Map.empty();
    };
  };
};
