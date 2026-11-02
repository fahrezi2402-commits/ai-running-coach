export const FATIGUE_SLOWDOWN_THRESHOLD = 0.1;
export const FATIGUE_BASELINE_DAYS = 28;
export const FATIGUE_MIN_BASELINE_RUNS = 3;
export const FATIGUE_LOAD_REDUCTION = 0.25;

const isValidDate = (value) => (
  typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
);

function activityPace(activity) {
  const pace = Number.isFinite(activity.paceMinutes)
    ? activity.paceMinutes
    : activity.durationMinutes / activity.distance;
  return Number.isFinite(pace) && pace >= 2 && pace <= 30 ? pace : null;
}

function validActivity(activity) {
  return activity
    && isValidDate(activity.date)
    && Number.isFinite(activity.distance)
    && activity.distance > 0
    && Number.isFinite(activity.durationMinutes)
    && activity.durationMinutes > 0
    && activityPace(activity) !== null;
}

function deduplicateActivities(activities) {
  const seenIds = new Set();
  const seenFingerprints = new Map();
  return activities.filter((activity) => {
    if (!validActivity(activity)) return false;
    if (typeof activity.id === "string" && activity.id) {
      if (seenIds.has(activity.id)) return false;
      seenIds.add(activity.id);
    }

    const fingerprint = [
      activity.date,
      Math.round(activity.distance * 100),
      Math.round(activity.durationMinutes * 100),
    ].join(":");
    const source = activity.source || "";
    const priorSources = seenFingerprints.get(fingerprint) || new Set();
    if (priorSources.size && !priorSources.has(source)) return false;
    priorSources.add(source);
    seenFingerprints.set(fingerprint, priorSources);
    return true;
  });
}

function average(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function isRun(workout) {
  return Boolean(workout && Number.isFinite(workout.distance) && workout.distance > 0);
}

function isOpenSlot(workout) {
  return !workout || workout.type === "Open" || workout.type === "Available";
}

function restWorkout(title, note, locked = false) {
  return { title, type: locked ? "Recovery" : "Rest", distance: 0, note, locked };
}

function addReason(row, flag, reason) {
  row.flags.push(flag);
  row.reasons.push(reason);
}

function localDateOffset(date, offset) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + offset));
  return result.toISOString().slice(0, 10);
}

export function calculateWeeklyPace(activities, weekStart, today = weekStart) {
  if (!isValidDate(weekStart) || !isValidDate(today)) {
    throw new TypeError("weekStart and today must be valid ISO dates.");
  }

  const deduplicated = deduplicateActivities(activities);
  const weekEnd = localDateOffset(weekStart, 6);
  const weeklyActivities = deduplicated.filter((activity) => (
    activity.date >= weekStart && activity.date <= weekEnd && activity.date <= today
  ));
  const baselineStart = localDateOffset(weekStart, -FATIGUE_BASELINE_DAYS);
  const baselineActivities = deduplicated.filter((activity) => (
    activity.date >= baselineStart && activity.date < weekStart
  ));
  const weeklyAveragePace = average(weeklyActivities.map(activityPace));
  const baselinePace = baselineActivities.length >= FATIGUE_MIN_BASELINE_RUNS
    ? average(baselineActivities.map(activityPace))
    : null;
  const fatigueRisk = weeklyAveragePace !== null
    && baselinePace !== null
    && weeklyAveragePace >= baselinePace * (1 + FATIGUE_SLOWDOWN_THRESHOLD);

  return {
    weeklyAveragePace,
    baselinePace,
    weeklyActivityCount: weeklyActivities.length,
    baselineActivityCount: baselineActivities.length,
    fatigueRisk,
    slowdownThreshold: FATIGUE_SLOWDOWN_THRESHOLD,
  };
}

export function autoRescheduleWeek({
  workouts,
  activities = [],
  weeklyTarget,
  volumeCap = weeklyTarget,
  today,
}) {
  if (!Array.isArray(workouts) || workouts.length !== 7) {
    throw new TypeError("workouts must contain exactly seven dated days.");
  }
  const sortedWorkouts = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const weekStart = sortedWorkouts[0]?.date;
  if (!isValidDate(weekStart) || sortedWorkouts.some((entry, index) => (
    !isValidDate(entry.date)
    || entry.date !== localDateOffset(weekStart, index)
    || (entry.workout
      && (!Number.isFinite(entry.workout.distance) || entry.workout.distance < 0))
  ))) {
    throw new TypeError("workouts must contain seven consecutive dates and valid workout distances.");
  }
  if (!isValidDate(today)) throw new TypeError("today must be a valid ISO date.");
  if (!Number.isFinite(weeklyTarget) || weeklyTarget < 0
    || !Number.isFinite(volumeCap) || volumeCap < 0) {
    throw new TypeError("weeklyTarget and volumeCap must be non-negative numbers.");
  }

  const uniqueActivities = deduplicateActivities(activities);
  const weekEnd = localDateOffset(weekStart, 6);
  const currentActivities = uniqueActivities.filter((activity) => (
    activity.date >= weekStart && activity.date <= weekEnd && activity.date <= today
  ));
  const activityByDate = new Map();
  currentActivities.forEach((activity) => {
    const onDate = activityByDate.get(activity.date) || [];
    onDate.push(activity);
    activityByDate.set(activity.date, onDate);
  });
  const weeklyDistance = currentActivities.reduce((sum, activity) => sum + activity.distance, 0);
  const pace = calculateWeeklyPace(uniqueActivities, weekStart, today);
  const rows = sortedWorkouts.map(({ date, workout, lockReason = "" }) => ({
    date,
    originalWorkout: { ...(workout || { title: "Open day", type: "Open", distance: 0, note: "No workout planned." }) },
    workout: { ...(workout || { title: "Open day", type: "Open", distance: 0, note: "No workout planned." }) },
    status: "planned",
    flags: [],
    reasons: [],
    lockReason,
  }));
  const hasMetTarget = weeklyDistance >= volumeCap;

  rows.forEach((row) => {
    const dateActivities = activityByDate.get(row.date);
    if (isRun(row.originalWorkout) && dateActivities?.length) {
      row.status = "completed";
      addReason(
        row,
        "completed",
        `A recorded ${dateActivities.map((activity) => activity.source || "run").join(" and ")} activity matches this date.`,
      );
      return;
    }
    if (isRun(row.originalWorkout) && row.lockReason) {
      row.status = "safety-blocked";
      row.workout = restWorkout("Rest / Recovery — safety lock", row.lockReason, true);
      addReason(row, "safety-blocked", `The planned run was blocked by a safety lock: ${row.lockReason}`);
      return;
    }
    if (row.lockReason) {
      row.workout = restWorkout("Rest / Recovery — safety lock", row.lockReason, true);
    }
    if (isRun(row.originalWorkout) && row.date < today) {
      row.status = "missed";
    }
  });

  const missedRows = rows.filter((row) => row.status === "missed");
  const scheduledDistance = () => rows.reduce((sum, row) => (
    sum + (row.date >= today && !row.lockReason && row.status !== "completed" && isRun(row.workout)
      ? row.workout.distance
      : 0)
  ), 0);
  missedRows.forEach((missed) => {
    const missedDistance = missed.originalWorkout.distance;
    if (hasMetTarget) {
      missed.status = "dropped";
      missed.workout = restWorkout(
        "Missed run — dropped",
        `The recorded weekly volume (${weeklyDistance.toFixed(1)} km) has already met the ${volumeCap.toFixed(1)} km cap; missed mileage will not be added.`,
      );
      addReason(missed, "dropped", "Weekly volume cap has already been reached; missed mileage is dropped.");
      return;
    }
    if (pace.fatigueRisk) {
      missed.status = "dropped";
      missed.workout = restWorkout(
        "Missed run — recovery retained",
        "Weekly pace is at least 10% slower than the historical baseline; missed mileage is not pushed into the remaining week.",
      );
      addReason(missed, "dropped", "Fatigue-risk heuristic prevents adding missed mileage.");
      return;
    }

    const destination = rows.find((row) => (
      row.date > missed.date
      && row.date >= today
      && !row.lockReason
      && !activityByDate.has(row.date)
      && isOpenSlot(row.workout)
    ));
    if (!destination) {
      missed.status = "dropped";
      missed.workout = restWorkout(
        "Missed run — dropped",
        "No later open day is available this week. Planned rest, strength, and recovery days are not converted into running.",
      );
      addReason(missed, "dropped", "No safe, later open slot is available in this week.");
      return;
    }

    const projectedDistance = weeklyDistance + scheduledDistance() + missedDistance;
    if (projectedDistance > volumeCap + 1e-9) {
      missed.status = "safety-blocked";
      missed.workout = restWorkout(
        "Missed run — volume cap protected",
        `Moving this run would raise projected weekly volume to ${projectedDistance.toFixed(1)} km, above the ${volumeCap.toFixed(1)} km cap.`,
        true,
      );
      addReason(missed, "safety-blocked", "The remaining weekly volume cap does not allow this shift.");
      return;
    }

    const movedWorkout = { ...missed.originalWorkout };
    destination.workout = {
      ...movedWorkout,
      title: `Rescheduled: ${movedWorkout.title}`,
      note: `${movedWorkout.note || ""}${movedWorkout.note ? " " : ""}Moved from ${missed.date} after the missed session; no other workout is stacked on this day.`,
    };
    destination.status = "shifted";
    addReason(destination, "shifted", `Run shifted from ${missed.date} to this open day within the same week.`);
    missed.status = "shifted";
    missed.workout = restWorkout(
      "Missed run — shifted",
      `This run was moved to ${destination.date}, an open day later in the same week.`,
    );
    addReason(missed, "shifted", `Run moved to ${destination.date}.`);
  });

  let fatigueAdjustment = null;
  if (pace.fatigueRisk) {
    const nextRun = rows.find((row) => (
      row.date >= today
      && isRun(row.workout)
      && row.status !== "completed"
      && !row.lockReason
    ));
    if (nextRun) {
      const originalDistance = nextRun.workout.distance;
      const convertToRest = nextRun.workout.type === "Quality";
      const reducedDistance = Math.floor(originalDistance * (1 - FATIGUE_LOAD_REDUCTION) * 10) / 10;
      nextRun.workout = convertToRest
        ? restWorkout(
          "Fatigue recovery rest",
          "Fatigue-risk heuristic: replace this quality workout with a full rest day. Do not make up the missed load; this is not a medical assessment.",
        )
        : {
          ...nextRun.workout,
          title: `Easy recovery: ${nextRun.workout.title}`,
          type: "Easy",
          distance: reducedDistance,
          note: `Fatigue-risk heuristic: reduce this planned load by 25% (${originalDistance.toFixed(1)} km to ${reducedDistance.toFixed(1)} km) and keep it easy. This is not a medical assessment.`,
        };
      nextRun.status = "fatigue-adjusted";
      addReason(
        nextRun,
        "fatigue-adjusted",
        convertToRest
          ? "Weekly average pace is at least 10% slower than the historical baseline; the next quality workout is replaced with rest."
          : "Weekly average pace is at least 10% slower than the historical baseline; next eligible run reduced by 25%.",
      );
      if (convertToRest) addReason(nextRun, "rest-conversion", "Quality workout replaced with a full rest day.");
      fatigueAdjustment = convertToRest
        ? { date: nextRun.date, type: "rest", originalDistance, adjustedDistance: 0 }
        : { date: nextRun.date, type: "reduced", originalDistance, adjustedDistance: reducedDistance };
    } else {
      const blockedRun = rows.find((row) => (
        row.date >= today && isRun(row.originalWorkout) && row.lockReason
      ));
      if (blockedRun) {
        blockedRun.status = "safety-blocked";
        addReason(blockedRun, "safety-blocked", "Fatigue adjustment was not applied because the existing hip/recovery lock takes priority.");
        fatigueAdjustment = { date: blockedRun.date, type: "blocked", reason: blockedRun.lockReason };
      }
    }
  }

  const schedule = rows.map(({ originalWorkout, lockReason, ...row }) => row);
  return {
    schedule,
    logs: schedule.map(({ date, status, flags, reasons }) => ({ date, status, flags, reasons })),
    weeklyTarget,
    volumeCap,
    weeklyDistance,
    volumeTargetMet: hasMetTarget,
    pace,
    fatigueAdjustment,
  };
}
