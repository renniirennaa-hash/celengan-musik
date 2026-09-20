import AccessControl "mo:caffeineai-authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";

module {
  type OldActor = {};

  type SavingsState = {
    var nextGoalId : Nat;
    var nextDepositId : Nat;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    savingsState : SavingsState;
    goals : Map.Map<Nat, Goal>;
    deposits : List.List<Deposit>;
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

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      savingsState = { var nextGoalId = 0; var nextDepositId = 0 };
      goals = Map.empty();
      deposits = List.empty();
    };
  };
};
