import assert from "node:assert/strict";
import test from "node:test";
import { BODYWEIGHT_WORKOUT, isBodyweightWorkoutAvailable } from "../src/bodyweightWorkout.js";

test("the tutorial is available only on unlocked, non-running off-days before taper", () => {
  for (const type of ["Rest", "Strength", "Cross-training"]) {
    assert.equal(isBodyweightWorkoutAvailable({
      week: 10,
      workout: { type, distance: 0, locked: false },
    }), true);
  }

  for (const entry of [
    { week: 10, workout: { type: "Easy", distance: 3, locked: false } },
    { week: 10, workout: { type: "Rest", distance: 0, locked: true } },
    { week: 10, workout: { type: "Recovery", distance: 0, locked: false } },
    { week: 150, workout: { type: "Rest", distance: 0, locked: false } },
    null,
  ]) {
    assert.equal(isBodyweightWorkoutAvailable(entry), false);
  }
});

test("the routine covers the safe bodyweight full-body circuit and session structure", () => {
  const movementNames = BODYWEIGHT_WORKOUT.movements.map(({ name }) => name);
  const movementIllustrations = BODYWEIGHT_WORKOUT.movements.map(({ illustration }) => illustration);

  assert.equal(BODYWEIGHT_WORKOUT.equipment, "Tanpa alat dan tanpa beban");
  assert.ok(BODYWEIGHT_WORKOUT.warmup.length >= 6);
  assert.ok(BODYWEIGHT_WORKOUT.cooldown.length >= 5);
  assert.equal(BODYWEIGHT_WORKOUT.movements.length, 10);
  for (const name of [
    "Squat tanpa lompatan",
    "Reverse lunge",
    "Lateral step",
    "Single-leg glute bridge",
    "Prone Y-T-W raises",
    "Pike push-up",
    "Push-up standar atau tangan rapat",
    "Prone reverse snow angels",
    "Mountain climber perlahan",
    "Hollow body hold",
  ]) {
    assert.ok(movementNames.includes(name));
  }
  assert.equal(new Set(movementIllustrations).size, movementIllustrations.length);
  assert.ok(BODYWEIGHT_WORKOUT.movements.every(({ category, illustration, prescription, steps, easier }) => category && illustration && prescription.startsWith("2–3 putaran") && steps.length >= 2 && easier));
  assert.ok(BODYWEIGHT_WORKOUT.warmup.some(({ name }) => name === "Cat-cow"));
  assert.ok(BODYWEIGHT_WORKOUT.warmup.some(({ name }) => name === "World's greatest stretch"));
  assert.ok(BODYWEIGHT_WORKOUT.cooldown.some(({ name }) => name === "Pigeon pose"));
  assert.ok(BODYWEIGHT_WORKOUT.cooldown.some(({ name }) => name === "Child's pose"));
});
