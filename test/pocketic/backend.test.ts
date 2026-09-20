import { PocketIc } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: _SERVICE;

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ actor } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  }));
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers an empty-state read instead of trapping", async () => {
  await expect(actor.listGoals()).resolves.toEqual([]);
});

it("round-trips a savings goal through the real canister", async () => {
  const created = await actor.createGoal({
    name: "Liburan",
    photoUrl: "data:image/png;base64,AAAA",
    targetAmount: 1_000_000n,
    startDate: "2026-01-01",
    targetDate: "2026-12-31",
  });
  expect(created.name).toBe("Liburan");
  expect(created.targetAmount).toBe(1_000_000n);

  const goals = await actor.listGoals();
  expect(goals).toHaveLength(1);
  expect(goals[0]).toMatchObject({ id: created.id, name: "Liburan" });
});

it("records a deposit and reports progress against the target", async () => {
  const goal = await actor.createGoal({
    name: "Motor",
    photoUrl: "data:image/png;base64,AAAA",
    targetAmount: 1_000_000n,
    startDate: "2026-01-01",
    targetDate: "2026-12-31",
  });

  const added = await actor.addDeposit({
    goalId: goal.id,
    amount: 1_500_000n,
    date: "2026-02-01",
    note: ["bonus"],
  });
  expect(added).toHaveProperty("ok");

  const progress = await actor.getProgress(goal.id, "2026-02-01");
  expect(progress).toHaveLength(1);
  expect(progress[0]?.totalDeposits).toBe(1_500_000n);
  expect(progress[0]?.percentage).toBe(100);
  expect(progress[0]?.isReached).toBe(true);
  expect(progress[0]?.remaining).toBe(0n);

  const deposits = await actor.listDeposits(goal.id);
  expect(deposits).toHaveLength(1);
  expect(deposits[0]).toMatchObject({ amount: 1_500_000n, note: ["bonus"] });
});

it("updates and deletes a deposit through the real canister", async () => {
  const goal = await actor.createGoal({
    name: "Sepeda",
    photoUrl: "data:image/png;base64,AAAA",
    targetAmount: 500_000n,
    startDate: "2026-01-01",
    targetDate: "2026-12-31",
  });
  const added = await actor.addDeposit({
    goalId: goal.id,
    amount: 100_000n,
    date: "2026-03-01",
    note: [],
  });
  if (!("ok" in added)) throw new Error("deposit was not created");

  const updated = await actor.updateDeposit({
    id: added.ok.id,
    amount: 250_000n,
    date: "2026-03-02",
    note: ["diperbarui"],
  });
  expect(updated).toHaveProperty("ok");
  if (!("ok" in updated)) throw new Error("deposit was not updated");
  expect(updated.ok.note).toEqual(["diperbarui"]);

  const stats = await actor.getStats(goal.id);
  expect(stats).toHaveLength(1);
  expect(stats[0]?.totalDeposits).toBe(250_000n);
  expect(stats[0]?.depositCount).toBe(1n);

  await expect(actor.deleteDeposit(added.ok.id)).resolves.toBe(true);
  await expect(actor.listDeposits(goal.id)).resolves.toEqual([]);
});

it("deletes a goal together with its deposits", async () => {
  const goal = await actor.createGoal({
    name: "Hapus",
    photoUrl: "data:image/png;base64,AAAA",
    targetAmount: 100_000n,
    startDate: "2026-01-01",
    targetDate: "2026-12-31",
  });
  await actor.addDeposit({
    goalId: goal.id,
    amount: 50_000n,
    date: "2026-04-01",
    note: [],
  });

  await expect(actor.deleteGoal(goal.id)).resolves.toBe(true);
  await expect(actor.getGoal(goal.id)).resolves.toEqual([]);
  await expect(actor.listDeposits(goal.id)).resolves.toEqual([]);
});

it("answers an empty music library instead of trapping", async () => {
  await expect(actor.listTracks()).resolves.toEqual([]);
});

it("round-trips an uploaded track through the real canister", async () => {
  const created = await actor.createTrack({
    title: "Lagu Uji",
    artist: "Unggahan saya",
    durationSeconds: 180n,
    contentType: "audio/mpeg",
    sizeBytes: 3_000_000n,
    blob: new Uint8Array([1, 2, 3, 4]),
    originalFilename: "lagu-uji.mp3",
  });
  expect(created.title).toBe("Lagu Uji");
  expect(created.artist).toBe("Unggahan saya");
  expect(created.contentType).toBe("audio/mpeg");
  expect(created.sizeBytes).toBe(3_000_000n);
  expect(created.originalFilename).toBe("lagu-uji.mp3");
  expect(Array.from(created.blob)).toEqual([1, 2, 3, 4]);

  const tracks = await actor.listTracks();
  expect(tracks).toHaveLength(1);
  expect(tracks[0]).toMatchObject({ id: created.id, title: "Lagu Uji" });

  const fetched = await actor.getTrack(created.id);
  expect(fetched).toHaveLength(1);
  expect(fetched[0]).toMatchObject({ id: created.id, title: "Lagu Uji" });
});

it("deletes an uploaded track and reports a missing one", async () => {
  const created = await actor.createTrack({
    title: "Hapus Lagu",
    artist: "Unggahan saya",
    durationSeconds: 90n,
    contentType: "audio/wav",
    sizeBytes: 1_000n,
    blob: new Uint8Array([9]),
    originalFilename: "hapus.wav",
  });

  await expect(actor.deleteTrack(created.id)).resolves.toBe(true);
  await expect(actor.getTrack(created.id)).resolves.toEqual([]);
  await expect(actor.deleteTrack(created.id)).resolves.toBe(false);
});

it("rejects an unsupported content type with a trap", async () => {
  await expect(
    actor.createTrack({
      title: "Bukan Audio",
      artist: "Unggahan saya",
      durationSeconds: 1n,
      contentType: "text/plain",
      sizeBytes: 10n,
      blob: new Uint8Array([1]),
      originalFilename: "notes.txt",
    }),
  ).rejects.toThrow(/Format file tidak didukung/);
});

it("rejects an empty title with a trap", async () => {
  await expect(
    actor.createTrack({
      title: "   ",
      artist: "Unggahan saya",
      durationSeconds: 1n,
      contentType: "audio/mpeg",
      sizeBytes: 10n,
      blob: new Uint8Array([1]),
      originalFilename: "kosong.mp3",
    }),
  ).rejects.toThrow(/Judul lagu tidak boleh kosong/);
});

it("returns a trend for the requested period", async () => {
  const goal = await actor.createGoal({
    name: "Tren",
    photoUrl: "data:image/png;base64,AAAA",
    targetAmount: 1_000_000n,
    startDate: "2026-01-01",
    targetDate: "2026-12-31",
  });
  await actor.addDeposit({
    goalId: goal.id,
    amount: 10_000n,
    date: "2026-05-01",
    note: [],
  });
  await actor.addDeposit({
    goalId: goal.id,
    amount: 20_000n,
    date: "2026-05-02",
    note: [],
  });

  const daily = await actor.getTrend(goal.id, { daily: null });
  expect(daily).toHaveLength(2);

  const monthly = await actor.getTrend(goal.id, { monthly: null });
  expect(monthly).toHaveLength(1);
  expect(monthly[0]).toMatchObject({ period: "2026-05", total: 30_000n, count: 2n });
});
