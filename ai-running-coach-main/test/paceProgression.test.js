import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MARATHON_GOAL_PACE,
  marathonTimeAtPace,
  parsePaceInput,
  suggestedQualityPaceForWeek,
} from "../src/paceProgression.js";

test("monthly quality-pace suggestions progress toward the goal pace", () => {
  const firstBlock = suggestedQualityPaceForWeek(139);
  const nextBlock = suggestedQualityPaceForWeek(143);
  const finalBlock = suggestedQualityPaceForWeek(155);

  assert.equal(firstBlock, 7.75);
  assert.ok(nextBlock < firstBlock);
  assert.equal(finalBlock, DEFAULT_MARATHON_GOAL_PACE);
});

test("quality-pace suggestions skip base, cutback, taper, and race weeks", () => {
  for (const week of [1, 52, 140, 144, 156, 157]) {
    assert.equal(suggestedQualityPaceForWeek(week), null);
  }
});

test("custom goals and pace input are validated", () => {
  assert.equal(suggestedQualityPaceForWeek(139, 6), 7.75);
  assert.equal(suggestedQualityPaceForWeek(139, 10), 10);
  assert.equal(suggestedQualityPaceForWeek(139, 4), null);
  assert.equal(parsePaceInput("07:30"), 7.5);
  assert.equal(parsePaceInput("15:00"), 15);
  assert.equal(parsePaceInput("4:59"), null);
  assert.equal(parsePaceInput("07:60"), null);
  assert.equal(parsePaceInput("7.5"), null);
});

test("the 7:15/km marathon aspiration is shown as an estimated finish time", () => {
  assert.equal(marathonTimeAtPace(DEFAULT_MARATHON_GOAL_PACE), "5h 05m 55s");
});
