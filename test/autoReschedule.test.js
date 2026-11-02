import assert from "node:assert/strict";
import test from "node:test";
import {
  autoRescheduleWeek,
  calculateWeeklyPace,
  FATIGUE_SLOWDOWN_THRESHOLD,
} from "../src/autoReschedule.js";

const WEEK_START = "2026-11-02";
const TODAY = "2026-11-05";

function dateAt(day) {
  return new Date(Date.UTC(2026, 10, 2 + day)).toISOString().slice(0, 10);
}

function weekWith(entries = {}) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = dateAt(index);
    const workout = Object.hasOwn(entries, index)
      ? entries[index]
      : { title: "Rest", type: "Rest", distance: 0, note: "Rest day." };
    return { date, workout };
  });
}

function run(distance = 5, type = "Easy") {
  return { title: `${type} run`, type, distance, note: "Run easy." };
}

function activity(id, date, distance, paceMinutes, source = "manual") {
  return {
    id,
    source,
    date,
    distance,
    durationMinutes: distance * paceMinutes,
    paceMinutes,
  };
}

function priorBaseline(pace = 8) {
  return [
    activity("prior-1", "2026-10-10", 5, pace),
    activity("prior-2", "2026-10-17", 6, pace),
    activity("prior-3", "2026-10-24", 7, pace),
  ];
}

function schedule(overrides = {}) {
  return autoRescheduleWeek({
    workouts: weekWith({ 1: run() }),
    today: TODAY,
    weeklyTarget: 20,
    ...overrides,
  });
}

test("weekly average pace uses valid runs and excludes cross-source duplicate records", () => {
  const pace = calculateWeeklyPace([
    ...priorBaseline(),
    activity("week-1", dateAt(1), 5, 8, "manual"),
    activity("week-1-copy", dateAt(1), 5, 8, "Strava"),
    activity("week-2", dateAt(2), 5, 10, "Strava"),
    { ...activity("invalid", dateAt(3), 5, 0), paceMinutes: 0 },
  ], WEEK_START, TODAY);

  assert.equal(pace.weeklyActivityCount, 2);
  assert.equal(pace.weeklyAveragePace, 9);
  assert.equal(pace.baselineActivityCount, 3);
  assert.equal(pace.baselinePace, 8);
  assert.equal(pace.fatigueRisk, true);
});

test("sessions today and in the future are not classified as missed", () => {
  const result = schedule({
    workouts: weekWith({ 1: run(), 3: run(), 4: run() }),
  });
  assert.equal(result.schedule[1].status, "dropped");
  assert.equal(result.schedule[3].status, "planned");
  assert.equal(result.schedule[4].status, "planned");
});

test("manual and Strava activities both complete a dated workout without duplicate volume", () => {
  for (const source of ["manual", "Strava"]) {
    const result = schedule({
      activities: [activity(`${source}-run`, dateAt(1), 5, 8, source)],
      workouts: weekWith({ 1: run() }),
    });
    assert.equal(result.schedule[1].status, "completed");
  }

  const duplicateResult = schedule({
    activities: [
      activity("manual-run", dateAt(1), 5, 8, "manual"),
      activity("strava-run", dateAt(1), 5, 8, "Strava"),
    ],
    workouts: weekWith({ 1: run() }),
  });
  assert.equal(duplicateResult.weeklyDistance, 5);
  assert.deepEqual(duplicateResult.schedule[1].flags, ["completed"]);
});

test("missed runs shift to a later open day when weekly volume has room", () => {
  const result = schedule({
    workouts: weekWith({ 1: run(), 3: null }),
    weeklyTarget: 10,
    volumeCap: 10,
  });

  assert.equal(result.schedule[1].status, "shifted");
  assert.equal(result.schedule[1].workout.type, "Rest");
  assert.equal(result.schedule[3].status, "shifted");
  assert.equal(result.schedule[3].workout.distance, 5);
  assert.match(result.schedule[3].reasons[0], /shifted from/);
});

test("a missed run is dropped when recorded weekly volume already meets the target", () => {
  const result = schedule({
    activities: [activity("existing", dateAt(0), 5, 8)],
    weeklyTarget: 5,
    volumeCap: 5,
    workouts: weekWith({ 1: run(), 3: null }),
  });

  assert.equal(result.volumeTargetMet, true);
  assert.equal(result.schedule[1].status, "dropped");
  assert.match(result.schedule[1].reasons[0], /already been reached/);
  assert.equal(result.schedule[3].workout.type, "Open");
});

test("a planned rest or strength day is never used as an open slot", () => {
  const result = schedule({
    workouts: weekWith({
      1: run(),
      2: { title: "Strength", type: "Strength", distance: 0, note: "Strength." },
      3: { title: "Rest", type: "Rest", distance: 0, note: "Rest." },
    }),
  });
  assert.equal(result.schedule[1].status, "dropped");
  assert.match(result.schedule[1].reasons[0], /No safe, later open slot/);
  assert.equal(result.schedule[2].workout.type, "Strength");
  assert.equal(result.schedule[3].workout.type, "Rest");
});

test("a shifted workout cannot stack with another workout on its destination day", () => {
  const result = schedule({
    workouts: weekWith({ 1: run(), 3: null }),
  });
  assert.equal(result.schedule[1].status, "shifted");
  assert.equal(result.schedule[3].status, "shifted");
  assert.equal(result.schedule.filter((entry) => entry.status === "shifted").length, 2);
  assert.equal(result.schedule[3].workout.distance, 5);
});

test("a shift that exceeds the remaining weekly volume cap is safety-blocked", () => {
  const result = schedule({
    workouts: weekWith({ 1: run(3), 3: null, 4: run(8) }),
    weeklyTarget: 10,
    volumeCap: 10,
  });
  assert.equal(result.schedule[1].status, "safety-blocked");
  assert.match(result.schedule[1].reasons[0], /volume cap/);
  assert.equal(result.schedule[3].workout.type, "Open");
});

test("volume comparisons use exact recorded totals instead of rounding up to the cap", () => {
  const result = schedule({
    activities: [activity("almost-at-cap", dateAt(0), 9.96, 8)],
    workouts: weekWith({ 1: run(0.1), 3: null }),
    weeklyTarget: 10,
    volumeCap: 10,
  });
  assert.equal(result.volumeTargetMet, false);
  assert.equal(result.schedule[1].status, "safety-blocked");
});

test("fatigue threshold is explicitly 10 percent and easy load is reduced", () => {
  assert.equal(FATIGUE_SLOWDOWN_THRESHOLD, 0.1);
  const result = schedule({
    workouts: weekWith({ 4: run(8) }),
    activities: [
      ...priorBaseline(8),
      activity("week-a", dateAt(1), 5, 8.8),
      activity("week-b", dateAt(2), 5, 8.8),
    ],
  });
  assert.equal(result.pace.fatigueRisk, true);
  assert.equal(result.schedule[4].status, "fatigue-adjusted");
  assert.equal(result.schedule[4].workout.distance, 6);
  assert.equal(result.schedule[4].workout.type, "Easy");
  assert.match(result.schedule[4].reasons[0], /reduced by 25%/);
});

test("fatigue converts the next quality workout to total rest", () => {
  const result = schedule({
    workouts: weekWith({ 4: run(8, "Quality") }),
    activities: [
      ...priorBaseline(8),
      activity("week-a", dateAt(1), 5, 9),
      activity("week-b", dateAt(2), 5, 9),
    ],
  });
  assert.equal(result.pace.fatigueRisk, true);
  assert.equal(result.schedule[4].status, "fatigue-adjusted");
  assert.equal(result.schedule[4].workout.type, "Rest");
  assert.equal(result.schedule[4].workout.distance, 0);
  assert.ok(result.schedule[4].flags.includes("rest-conversion"));
});

test("fatigue heuristic does not activate below its threshold or without a historical baseline", () => {
  const belowThreshold = schedule({
    workouts: weekWith({ 4: run() }),
    activities: [
      ...priorBaseline(8),
      activity("week-a", dateAt(1), 5, 8.79),
      activity("week-b", dateAt(2), 5, 8.79),
    ],
  });
  const noBaseline = schedule({
    workouts: weekWith({ 4: run() }),
    activities: [activity("week-only", dateAt(2), 5, 12)],
  });
  assert.equal(belowThreshold.pace.fatigueRisk, false);
  assert.equal(noBaseline.pace.baselinePace, null);
  assert.equal(noBaseline.pace.fatigueRisk, false);
});

test("hip and recovery locks block runs and take priority over fatigue adjustments", () => {
  const lockReason = "Hip check-in is WASPADA.";
  const hipLocked = weekWith({ 4: run() }).map((entry) => ({ ...entry, lockReason }));
  const result = schedule({
    workouts: hipLocked,
    activities: [
      ...priorBaseline(8),
      activity("week-a", dateAt(1), 5, 9),
      activity("week-b", dateAt(2), 5, 9),
    ],
  });
  assert.equal(result.schedule[4].status, "safety-blocked");
  assert.equal(result.schedule[4].workout.type, "Recovery");
  assert.equal(result.fatigueAdjustment.type, "blocked");
  assert.ok(result.schedule[4].flags.includes("safety-blocked"));
});

test("date-specific recovery locks block planned runs and cannot receive a shift", () => {
  const workouts = weekWith({ 1: run(), 3: run() });
  workouts[3].lockReason = "Pace guardrail reserved this date for recovery.";
  const result = schedule({ workouts });

  assert.equal(result.schedule[1].status, "dropped");
  assert.equal(result.schedule[3].status, "safety-blocked");
  assert.equal(result.schedule[3].workout.type, "Recovery");
  assert.ok(result.schedule[3].flags.includes("safety-blocked"));
});

test("result includes per-session reasoning flags and summary metrics", () => {
  const result = schedule({ workouts: weekWith({ 1: run() }) });
  assert.equal(result.logs.length, 7);
  assert.deepEqual(result.logs[1].flags, ["dropped"]);
  assert.match(result.logs[1].reasons.join(" "), /open slot/);
  assert.equal(result.weeklyTarget, 20);
  assert.equal(result.volumeCap, 20);
});
