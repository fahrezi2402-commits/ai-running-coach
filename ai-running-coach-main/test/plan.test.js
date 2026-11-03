import assert from "node:assert/strict";
import test from "node:test";
import { TRAINING_PLAN, TOTAL_WEEKS, getWorkoutForDate } from "../src/plan.js";

const at = (y, m, d) => new Date(y, m - 1, d);
const day = (w, dow) => { const r = TRAINING_PLAN[w - 1]; const d = new Date(r.start); d.setDate(d.getDate() + ((dow + 6) % 7)); return getWorkoutForDate(d, r); };

test("rencana 157 minggu: mulai 9 Nov 2026, blok maraton 2 Jul 2029, lomba Minggu 4 Nov 2029", () => {
  assert.equal(TRAINING_PLAN.length, TOTAL_WEEKS);
  assert.deepEqual([TRAINING_PLAN[0].start.getFullYear(), TRAINING_PLAN[0].start.getMonth(), TRAINING_PLAN[0].start.getDate()], [2026, 10, 9]);
  assert.equal(TRAINING_PLAN[138].start.getTime(), at(2029, 7, 2).getTime());
  assert.equal(day(156, 0).type, "Race");
  assert.equal(TRAINING_PLAN[155].end.getTime(), at(2029, 11, 4).getTime());
});
test("12 minggu pertama sesuai jadwal dan minggu pemulihan", () => {
  assert.deepEqual(TRAINING_PLAN.slice(0, 12).map((r) => r.targetVolume), [17, 18, 20, 15, 21, 22, 23, 17, 25, 25, 27, 16]);
  assert.equal(day(1, 6).distance, 7);
  assert.equal(day(12, 6).title, "Tes 5K");
});
test("blok maraton: tiga lari panjang >= 30 km dan puncak 60 km", () => {
  const blk = TRAINING_PLAN.slice(138, 155);
  assert.equal(blk.filter((r) => r.longRun >= 30).length, 3);
  assert.equal(Math.max(...blk.map((r) => r.targetVolume)), 60);
});
test("pola mingguan: kekuatan Senin dan Kamis, istirahat Minggu", () => {
  for (const w of [5, 40, 80, 120, 145]) {
    assert.equal(day(w, 1).type, "Strength"); assert.equal(day(w, 4).type, "Strength"); assert.equal(day(w, 0).type, "Rest");
  }
});
