import Common "common";

module {
  public type GoalId = Common.GoalId;
  public type DepositId = Common.DepositId;
  public type Timestamp = Common.Timestamp;
  public type DateText = Common.DateText;
  public type Rupiah = Common.Rupiah;

  /// A savings goal as stored internally.
  public type Goal = {
    id : GoalId;
    name : Text;
    photoUrl : Text;
    targetAmount : Rupiah;
    startDate : DateText;
    targetDate : DateText;
    createdAt : Timestamp;
  };

  /// A savings goal as returned across the API boundary.
  public type GoalView = {
    id : GoalId;
    name : Text;
    photoUrl : Text;
    targetAmount : Rupiah;
    startDate : DateText;
    targetDate : DateText;
    createdAt : Timestamp;
  };

  /// A deposit as stored internally.
  public type Deposit = {
    id : DepositId;
    goalId : GoalId;
    amount : Rupiah;
    date : DateText;
    note : ?Text;
    createdAt : Timestamp;
  };

  /// A deposit as returned across the API boundary.
  public type DepositView = {
    id : DepositId;
    goalId : GoalId;
    amount : Rupiah;
    date : DateText;
    note : ?Text;
    createdAt : Timestamp;
  };

  /// Aggregated progress for a single goal.
  public type GoalProgress = {
    goalId : GoalId;
    totalDeposits : Rupiah;
    depositCount : Nat;
    remaining : Rupiah;
    percentage : Float;
    isReached : Bool;
    isOverdue : Bool;
    daysRemaining : Int;
  };

  /// Aggregate statistics for a single goal.
  public type GoalStats = {
    goalId : GoalId;
    totalDeposits : Rupiah;
    depositCount : Nat;
    averageDeposit : Float;
    remaining : Rupiah;
  };

  /// A single point in the deposit trend chart.
  public type TrendPoint = {
    period : Text;
    total : Rupiah;
    count : Nat;
  };

  /// The trend granularity requested by the caller.
  public type TrendPeriod = {
    #daily;
    #monthly;
  };

  /// Input for creating a savings goal.
  public type CreateGoalInput = {
    name : Text;
    photoUrl : Text;
    targetAmount : Rupiah;
    startDate : DateText;
    targetDate : DateText;
  };

  /// Input for creating a deposit.
  public type CreateDepositInput = {
    goalId : GoalId;
    amount : Rupiah;
    date : DateText;
    note : ?Text;
  };

  /// Input for updating an existing deposit.
  public type UpdateDepositInput = {
    id : DepositId;
    amount : Rupiah;
    date : DateText;
    note : ?Text;
  };

  /// Caller-visible failure modes for savings operations.
  public type SavingsError = {
    #goalNotFound : GoalId;
    #depositNotFound : DepositId;
    #invalidInput : Text;
  };
};
