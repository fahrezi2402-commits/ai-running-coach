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

test("the routine covers the equipment-free full-body blocks with safe progressions", () => {
  const movements = BODYWEIGHT_WORKOUT.blocks.flatMap(({ movements: blockMovements }) => blockMovements);
  const movementNames = movements.map(({ name }) => name);
  const movementIllustrations = movements.map(({ illustration }) => illustration);

  assert.equal(BODYWEIGHT_WORKOUT.equipment, "Tanpa alat dan tanpa beban");
  assert.ok(BODYWEIGHT_WORKOUT.warmup.length >= 8);
  assert.ok(BODYWEIGHT_WORKOUT.cooldown.length >= 6);
  assert.equal(BODYWEIGHT_WORKOUT.blocks.length, 3);
  assert.equal(movements.length, 12);
  for (const name of [
    "Calf raise pelan",
    "Bodyweight squat pelan",
    "Reverse lunge atau split squat statis",
    "Single-leg RDL reach",
    "Single-leg glute bridge",
    "Prone Y-T-W-I raises",
    "Pike push-up",
    "Push-up standar atau knee push-up",
    "Prone reverse snow angels",
    "Side plank",
    "Dead bug",
    "Mountain climber terkendali",
  ]) {
    assert.ok(movementNames.includes(name));
  }
  assert.equal(new Set(movementIllustrations).size, movementIllustrations.length);
  assert.ok(movements.every(({ illustration, prescription, steps, easier }) => illustration && prescription.startsWith("1–2 putaran") && steps.length >= 2 && easier));
  assert.ok(movements.some(({ advanced }) => advanced?.includes("Pogo jumps")));
  assert.ok(movements.some(({ advanced }) => advanced?.includes("Depth-jump-to-jump-squat")));
  assert.ok(movements.some(({ advanced }) => advanced?.includes("doorframe/table row")));
  assert.ok(movements.every(({ steps, easier, advanced = "" }) => ![...steps, easier, advanced].join(" ").match(/use (?:a )?(?:chair|table|doorframe)|chair as|table as|doorframe as/i)));
  assert.ok(BODYWEIGHT_WORKOUT.warmup.some(({ name }) => name.startsWith("Cat-cow")));
  assert.ok(BODYWEIGHT_WORKOUT.warmup.some(({ name }) => name === "World's greatest stretch"));
  assert.ok(BODYWEIGHT_WORKOUT.warmup.some(({ name }) => name === "Wall slides"));
  assert.ok(BODYWEIGHT_WORKOUT.cooldown.some(({ name }) => name === "Figure-4 atau pigeon pose"));
  assert.ok(BODYWEIGHT_WORKOUT.cooldown.some(({ name }) => name.startsWith("Child's pose")));
});
