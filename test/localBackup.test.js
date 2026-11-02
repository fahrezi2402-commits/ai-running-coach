import assert from "node:assert/strict";
import test from "node:test";
import { createLocalBackup, parseLocalBackup } from "../src/localBackup.js";

const sampleData = {
  activities: [{
    id: "run-1",
    source: "manual",
    date: "2026-11-02",
    week: 1,
    distance: 5,
    durationMinutes: 40,
    paceMinutes: 8,
    pace: "08:00",
    heartRate: 140,
    loggedAt: "2026-11-02T08:00:00.000Z",
  }],
  checkIns: {
    1: {
      clicking: "No",
      painScore: 0,
      symptoms: "",
      status: "AMAN",
      week: 1,
      savedAt: "2026-11-02T08:00:00.000Z",
    },
  },
  recoveryDates: ["2026-11-03"],
  guardrailEvents: [{
    id: "guardrail-1",
    date: "2026-11-02",
    recoveryDate: "2026-11-03",
    pace: "08:00",
    limit: "10:15",
    distance: 5,
  }],
  profile: { age: 26, heightCm: 170, weightKg: 65, marathonGoalPace: 7.5 },
};

test("local backup round-trips the versioned profile and training records", () => {
  const json = JSON.stringify(createLocalBackup(sampleData, "2026-11-02T08:00:00.000Z"));

  assert.deepEqual(parseLocalBackup(json), sampleData);
});

test("local backup rejects invalid JSON and unsupported schema versions", () => {
  assert.throws(() => parseLocalBackup("{"), /not valid JSON/);
  assert.throws(
    () => parseLocalBackup(JSON.stringify({ ...createLocalBackup(sampleData), schemaVersion: 2 })),
    /schema version is not supported/,
  );
});

test("local backup rejects invalid records before returning import data", () => {
  const invalidBackup = createLocalBackup({
    ...sampleData,
    activities: [{ ...sampleData.activities[0], distance: -1 }],
  });

  assert.throws(() => parseLocalBackup(JSON.stringify(invalidBackup)), /invalid activity records/);
});

test("local backup rejects missing or unsupported data fields", () => {
  const invalidBackup = createLocalBackup({ ...sampleData, profile: undefined });

  assert.throws(() => parseLocalBackup(JSON.stringify(invalidBackup)), /missing required local data/);
});

test("local backup accepts older profiles and validates an optional marathon goal pace", () => {
  const olderProfile = { age: 26, heightCm: 170, weightKg: 65 };
  assert.deepEqual(
    parseLocalBackup(JSON.stringify(createLocalBackup({ ...sampleData, profile: olderProfile }))).profile,
    olderProfile,
  );

  const invalidBackup = createLocalBackup({
    ...sampleData,
    profile: { ...sampleData.profile, marathonGoalPace: 4 },
  });
  assert.throws(() => parseLocalBackup(JSON.stringify(invalidBackup)), /invalid training profile/);
});
