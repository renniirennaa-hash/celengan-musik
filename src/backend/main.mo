import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Expose "mo:caffeineai-oql/Expose";
import BlobValue "mo:caffeineai-oql/BlobValue";
import Entity "mo:caffeineai-oql/Entity";
import ListEntity "mo:caffeineai-oql/ListEntity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import IntValue "mo:caffeineai-oql/IntValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Timer "mo:core/Timer";
import ApiDocMixin "mixins/api-doc";
import MusicApi "mixins/music-api";
import ReminderApi "mixins/reminder-api";
import SavingsApi "mixins/savings-api";
import OqlLib "lib/oql";
import MusicLib "lib/music";
import ReminderLib "lib/reminder";
import SavingsLib "lib/savings";
import MusicTypes "types/music";
import Types "types/savings";

actor {
  let accessControlState : AccessControl.AccessControlState;
  let savingsState : SavingsLib.SavingsState;
  let goals : Map.Map<Nat, Types.Goal>;
  let deposits : List.List<Types.Deposit>;
  let musicState : MusicLib.MusicState;
  let tracks : Map.Map<Nat, MusicTypes.Track>;
  let reminderState : ReminderLib.ReminderState;

  // Daily reminder at 19:00 WIB (12:00 UTC). A one-shot timer is re-armed
  // after every fire with the delay to the next 12:00 UTC boundary, so the
  // send lands on the wall-clock time instead of drifting with canister start.
  // The timer is transient: it is re-armed on every canister start and never
  // persisted.
  func dailyReminderTick() : async () {
    if (reminderState.enabled and ReminderLib.isConfigured(reminderState)) {
      ignore await ReminderLib.sendReminderNow(reminderState, { goals; deposits }, Time.now());
    };
    ignore Timer.setTimer<system>(
      #nanoseconds(ReminderLib.delayToNextDailySend(Time.now())),
      dailyReminderTick,
    );
  };

  transient let _dailyReminderTimer : Timer.TimerId = Timer.setTimer<system>(
    #nanoseconds(ReminderLib.delayToNextDailySend(Time.now())),
    dailyReminderTick,
  );

  include MixinObjectStorage();
  include MixinAuthorization(accessControlState, null);
  include SavingsApi(savingsState, goals, deposits);
  include MusicApi(musicState, tracks);
  include ReminderApi(accessControlState, reminderState, goals, deposits);
  include ApiDocMixin();
  include Expose({
    entities = [
      goals.toEntity("goal", "Goal", "id")
        .sample({
          id = 0;
          name = "";
          photoUrl = "";
          targetAmount = 0;
          startDate = "";
          targetDate = "";
          createdAt = 0;
        })
        .public_()
        .build(),
      deposits.toEntity("deposit", "Deposit", "id")
        .sample({
          id = 0;
          goalId = 0;
          amount = 0;
          date = "";
          note = null;
          createdAt = 0;
        })
        .edge("goalId", "goal")
        .public_()
        .build(),
      tracks.toEntity("track", "Track", "id")
        .sample({
          id = 0;
          title = "";
          artist = "";
          durationSeconds = 0;
          contentType = "";
          sizeBytes = 0;
          blob = "";
          originalFilename = "";
          createdAt = 0;
        } : MusicTypes.Track)
        .public_()
        .build(),
    ];
  });
};
