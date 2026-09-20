import List "mo:core/List";
import Map "mo:core/Map";
import Types "../types/savings";

module {
  public type Goal = Types.Goal;
  public type GoalView = Types.GoalView;
  public type Deposit = Types.Deposit;
  public type DepositView = Types.DepositView;
  public type GoalProgress = Types.GoalProgress;
  public type GoalStats = Types.GoalStats;
  public type TrendPoint = Types.TrendPoint;
  public type TrendPeriod = Types.TrendPeriod;
  public type CreateGoalInput = Types.CreateGoalInput;
  public type CreateDepositInput = Types.CreateDepositInput;
  public type UpdateDepositInput = Types.UpdateDepositInput;
  public type SavingsError = Types.SavingsError;

  /// Mutable counters shared with the API mixin.
  public type SavingsState = {
    var nextGoalId : Nat;
    var nextDepositId : Nat;
  };

  public func toGoalView(goal : Goal) : GoalView {
    {
      id = goal.id;
      name = goal.name;
      photoUrl = goal.photoUrl;
      targetAmount = goal.targetAmount;
      startDate = goal.startDate;
      targetDate = goal.targetDate;
      createdAt = goal.createdAt;
    };
  };

  public func toDepositView(deposit : Deposit) : DepositView {
    {
      id = deposit.id;
      goalId = deposit.goalId;
      amount = deposit.amount;
      date = deposit.date;
      note = deposit.note;
      createdAt = deposit.createdAt;
    };
  };

  public func createGoal(
    state : SavingsState,
    goals : Map.Map<Nat, Goal>,
    input : CreateGoalInput,
    now : Int,
  ) : GoalView {
    let id = state.nextGoalId;
    state.nextGoalId := id + 1;
    let goal : Goal = {
      id;
      name = input.name;
      photoUrl = input.photoUrl;
      targetAmount = input.targetAmount;
      startDate = input.startDate;
      targetDate = input.targetDate;
      createdAt = now;
    };
    goals.add(id, goal);
    toGoalView(goal);
  };

  public func listGoals(goals : Map.Map<Nat, Goal>) : [GoalView] {
    let all = goals.values().toArray();
    let sorted = all.sort(func(a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
    sorted.map(func(goal) = toGoalView(goal));
  };

  public func getGoal(goals : Map.Map<Nat, Goal>, id : Nat) : ?GoalView {
    switch (goals.get(id)) {
      case (?goal) { ?toGoalView(goal) };
      case null { null };
    };
  };

  public func deleteGoal(
    goals : Map.Map<Nat, Goal>,
    deposits : List.List<Deposit>,
    id : Nat,
  ) : Bool {
    switch (goals.get(id)) {
      case null { false };
      case (?_) {
        goals.remove(id);
        let snapshot = deposits.toArray();
        deposits.clear();
        for (deposit in snapshot.values()) {
          if (deposit.goalId != id) {
            deposits.add(deposit);
          };
        };
        true;
      };
    };
  };

  public func addDeposit(
    state : SavingsState,
    goals : Map.Map<Nat, Goal>,
    deposits : List.List<Deposit>,
    input : CreateDepositInput,
    now : Int,
  ) : { #ok : DepositView; #err : SavingsError } {
    switch (goals.get(input.goalId)) {
      case null { #err(#goalNotFound(input.goalId)) };
      case (?_) {
        let id = state.nextDepositId;
        state.nextDepositId := id + 1;
        let deposit : Deposit = {
          id;
          goalId = input.goalId;
          amount = input.amount;
          date = input.date;
          note = input.note;
          createdAt = now;
        };
        deposits.add(deposit);
        #ok(toDepositView(deposit));
      };
    };
  };

  public func listDeposits(
    deposits : List.List<Deposit>,
    goalId : Nat,
  ) : [DepositView] {
    let matching = deposits.filter(func(deposit) = deposit.goalId == goalId).toArray();
    let sorted = matching.sort(func(a, b) = if (a.date > b.date) { #less } else if (a.date < b.date) { #greater } else if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
    sorted.map(func(deposit) = toDepositView(deposit));
  };

  public func updateDeposit(
    deposits : List.List<Deposit>,
    input : UpdateDepositInput,
  ) : { #ok : DepositView; #err : SavingsError } {
    switch (deposits.find(func(deposit) = deposit.id == input.id)) {
      case null { #err(#depositNotFound(input.id)) };
      case (?existing) {
        let updated : Deposit = {
          id = existing.id;
          goalId = existing.goalId;
          amount = input.amount;
          date = input.date;
          note = input.note;
          createdAt = existing.createdAt;
        };
        let snapshot = deposits.toArray();
        deposits.clear();
        for (deposit in snapshot.values()) {
          if (deposit.id == input.id) {
            deposits.add(updated);
          } else {
            deposits.add(deposit);
          };
        };
        #ok(toDepositView(updated));
      };
    };
  };

  public func deleteDeposit(
    deposits : List.List<Deposit>,
    id : Nat,
  ) : Bool {
    var removed = false;
    let snapshot = deposits.toArray();
    deposits.clear();
    for (deposit in snapshot.values()) {
      if (deposit.id == id) {
        removed := true;
      } else {
        deposits.add(deposit);
      };
    };
    removed;
  };

  func totalFor(deposits : List.List<Deposit>, goalId : Nat) : Nat {
    var total = 0;
    for (deposit in deposits.values()) {
      if (deposit.goalId == goalId) {
        total += deposit.amount;
      };
    };
    total;
  };

  func countFor(deposits : List.List<Deposit>, goalId : Nat) : Nat {
    var count = 0;
    for (deposit in deposits.values()) {
      if (deposit.goalId == goalId) {
        count += 1;
      };
    };
    count;
  };

  /// Days from `from` to `to`, both `YYYY-MM-DD`. Negative when `to` is earlier.
  func daysBetween(from : Text, to : Text) : Int {
    daysFromCivil(to) - daysFromCivil(from);
  };

  /// The `index`-th `-`-separated part of a `YYYY-MM-DD` date, or `fallback`
  /// when the date is malformed and the part is missing.
  func datePart(parts : [Text], index : Nat, fallback : Text) : Text {
    if (index < parts.size()) { parts[index] } else { fallback };
  };

  /// Days since the Unix epoch for a `YYYY-MM-DD` date (Howard Hinnant's algorithm).
  func daysFromCivil(date : Text) : Int {
    let parts = date.split(#char '-').toArray();
    let y = datePart(parts, 0, "0").toInt() ?? 0;
    let m = datePart(parts, 1, "1").toInt() ?? 1;
    let d = datePart(parts, 2, "1").toInt() ?? 1;
    let yy = if (m <= 2) { y - 1 } else { y };
    let era = if (yy >= 0) { yy / 400 } else { (yy - 399) / 400 };
    let yoe = yy - era * 400;
    let mp = if (m > 2) { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468;
  };

  /// The amount still needed to reach `target`, or 0 once `total` meets it.
  /// Avoids an unguarded `Nat` subtraction.
  func remainingAmount(target : Nat, total : Nat) : Nat {
    if (total >= target) { 0 } else { target - total };
  };

  public func getProgress(
    goals : Map.Map<Nat, Goal>,
    deposits : List.List<Deposit>,
    goalId : Nat,
    today : Types.DateText,
  ) : ?GoalProgress {
    switch (goals.get(goalId)) {
      case null { null };
      case (?goal) {
        let total = totalFor(deposits, goalId);
        let count = countFor(deposits, goalId);
        let remaining = remainingAmount(goal.targetAmount, total);
        let percentage = if (goal.targetAmount == 0) {
          100.0;
        } else {
          let raw = total.toFloat() / goal.targetAmount.toFloat() * 100.0;
          if (raw > 100.0) { 100.0 } else { raw };
        };
        let isReached = total >= goal.targetAmount;
        let daysRemaining = daysBetween(today, goal.targetDate);
        let isOverdue = daysRemaining < 0 and not isReached;
        ?{
          goalId;
          totalDeposits = total;
          depositCount = count;
          remaining;
          percentage;
          isReached;
          isOverdue;
          daysRemaining;
        };
      };
    };
  };

  public func getStats(
    goals : Map.Map<Nat, Goal>,
    deposits : List.List<Deposit>,
    goalId : Nat,
  ) : ?GoalStats {
    switch (goals.get(goalId)) {
      case null { null };
      case (?goal) {
        let total = totalFor(deposits, goalId);
        let count = countFor(deposits, goalId);
        let remaining = remainingAmount(goal.targetAmount, total);
        let average = if (count == 0) { 0.0 } else { total.toFloat() / count.toFloat() };
        ?{
          goalId;
          totalDeposits = total;
          depositCount = count;
          averageDeposit = average;
          remaining;
        };
      };
    };
  };

  public func getTrend(
    deposits : List.List<Deposit>,
    goalId : Nat,
    period : TrendPeriod,
  ) : [TrendPoint] {
    let matching = deposits.filter(func(deposit) = deposit.goalId == goalId).toArray();
    let keyed = matching.map(func(deposit) = (periodKey(deposit.date, period), deposit.amount));
    let sorted = keyed.sort(func(a, b) = if (a.0 < b.0) { #less } else if (a.0 > b.0) { #greater } else { #equal });
    var result : [TrendPoint] = [];
    var currentKey = "";
    var currentTotal = 0;
    var currentCount = 0;
    var started = false;
    for ((key, amount) in sorted.values()) {
      if (not started) {
        currentKey := key;
        currentTotal := amount;
        currentCount := 1;
        started := true;
      } else if (key == currentKey) {
        currentTotal += amount;
        currentCount += 1;
      } else {
        result := result.concat([{ period = currentKey; total = currentTotal; count = currentCount }]);
        currentKey := key;
        currentTotal := amount;
        currentCount := 1;
      };
    };
    if (started) {
      result := result.concat([{ period = currentKey; total = currentTotal; count = currentCount }]);
    };
    result;
  };

  func periodKey(date : Text, period : TrendPeriod) : Text {
    switch (period) {
      case (#daily) { date };
      case (#monthly) {
        let parts = date.split(#char '-').toArray();
        let y = datePart(parts, 0, "0000");
        let m = datePart(parts, 1, "00");
        y # "-" # m;
      };
    };
  };
};
