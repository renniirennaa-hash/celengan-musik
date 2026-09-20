import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import SavingsLib "../lib/savings";
import Types "../types/savings";

mixin (
  state : SavingsLib.SavingsState,
  goals : Map.Map<Nat, Types.Goal>,
  deposits : List.List<Types.Deposit>,
) {
  /// Create a new savings goal for the caller.
  public shared ({ caller }) func createGoal(input : Types.CreateGoalInput) : async Types.GoalView {
    ignore caller;
    SavingsLib.createGoal(state, goals, input, Time.now());
  };

  /// List every savings goal owned by the caller.
  public query ({ caller }) func listGoals() : async [Types.GoalView] {
    ignore caller;
    SavingsLib.listGoals(goals);
  };

  /// Fetch a single savings goal owned by the caller.
  public query ({ caller }) func getGoal(id : Nat) : async ?Types.GoalView {
    ignore caller;
    SavingsLib.getGoal(goals, id);
  };

  /// Delete a savings goal and all of its deposits.
  public shared ({ caller }) func deleteGoal(id : Nat) : async Bool {
    ignore caller;
    SavingsLib.deleteGoal(goals, deposits, id);
  };

  /// Add a deposit to one of the caller's savings goals.
  public shared ({ caller }) func addDeposit(input : Types.CreateDepositInput) : async { #ok : Types.DepositView; #err : Types.SavingsError } {
    ignore caller;
    SavingsLib.addDeposit(state, goals, deposits, input, Time.now());
  };

  /// List the deposits of one of the caller's savings goals, newest first.
  public query ({ caller }) func listDeposits(goalId : Nat) : async [Types.DepositView] {
    ignore caller;
    SavingsLib.listDeposits(deposits, goalId);
  };

  /// Update an existing deposit owned by the caller.
  public shared ({ caller }) func updateDeposit(input : Types.UpdateDepositInput) : async { #ok : Types.DepositView; #err : Types.SavingsError } {
    ignore caller;
    SavingsLib.updateDeposit(deposits, input);
  };

  /// Delete an existing deposit owned by the caller.
  public shared ({ caller }) func deleteDeposit(id : Nat) : async Bool {
    ignore caller;
    SavingsLib.deleteDeposit(deposits, id);
  };

  /// Compute progress for one of the caller's savings goals.
  public query ({ caller }) func getProgress(goalId : Nat, today : Types.DateText) : async ?Types.GoalProgress {
    ignore caller;
    SavingsLib.getProgress(goals, deposits, goalId, today);
  };

  /// Compute aggregate statistics for one of the caller's savings goals.
  public query ({ caller }) func getStats(goalId : Nat) : async ?Types.GoalStats {
    ignore caller;
    SavingsLib.getStats(goals, deposits, goalId);
  };

  /// Compute the deposit trend for one of the caller's savings goals.
  public query ({ caller }) func getTrend(goalId : Nat, period : Types.TrendPeriod) : async [Types.TrendPoint] {
    ignore caller;
    SavingsLib.getTrend(deposits, goalId, period);
  };
};
