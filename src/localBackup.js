export const LOCAL_DATA_KEYS = {
  activities: "ai-running-coach:activities",
  checkIns: "ai-running-coach:hip-checkins",
  recoveryDates: "ai-running-coach:recovery-dates",
  guardrailEvents: "ai-running-coach:guardrail-events",
  profile: "ai-running-coach:profile",
};

const BACKUP_VERSION = 1;
const BACKUP_DATA_FIELDS = Object.keys(LOCAL_DATA_KEYS);
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isPositiveNumber = (value) => Number.isFinite(value) && value > 0;
const isIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
};
const isTimestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));

function isValidActivity(activity) {
  return isRecord(activity)
    && typeof activity.id === "string" && activity.id.length > 0
    && typeof activity.source === "string" && activity.source.length > 0
    && isIsoDate(activity.date)
    && Number.isInteger(activity.week) && activity.week >= 1 && activity.week <= 157
    && isPositiveNumber(activity.distance)
    && isPositiveNumber(activity.durationMinutes)
    && isPositiveNumber(activity.paceMinutes)
    && typeof activity.pace === "string"
    && (activity.heartRate === null || (Number.isFinite(activity.heartRate) && activity.heartRate >= 30 && activity.heartRate <= 230))
    && isTimestamp(activity.loggedAt);
}

function isValidCheckIns(checkIns) {
  return isRecord(checkIns) && Object.entries(checkIns).every(([week, checkIn]) => (
    isRecord(checkIn)
      && Number.isInteger(Number(week)) && Number(week) >= 1 && Number(week) <= 157
      && checkIn.week === Number(week)
      && (checkIn.clicking === "Yes" || checkIn.clicking === "No")
      && Number.isInteger(checkIn.painScore) && checkIn.painScore >= 0 && checkIn.painScore <= 10
      && typeof checkIn.symptoms === "string"
      && ["AMAN", "WASPADA", "PERIKSA"].includes(checkIn.status)
      && isTimestamp(checkIn.savedAt)
  ));
}

function isValidGuardrailEvent(event) {
  return isRecord(event)
    && typeof event.id === "string" && event.id.length > 0
    && isIsoDate(event.date)
    && isIsoDate(event.recoveryDate)
    && typeof event.pace === "string"
    && typeof event.limit === "string"
    && isPositiveNumber(event.distance);
}

export function createLocalBackup(data, exportedAt = new Date().toISOString()) {
  return {
    schemaVersion: BACKUP_VERSION,
    exportedAt,
    data,
  };
}

export function parseLocalBackup(json) {
  let backup;
  try {
    backup = JSON.parse(json);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!isRecord(backup) || backup.schemaVersion !== BACKUP_VERSION || !isTimestamp(backup.exportedAt)) {
    throw new Error("This backup format or schema version is not supported.");
  }
  if (!isRecord(backup.data)
    || BACKUP_DATA_FIELDS.length !== Object.keys(backup.data).length
    || !BACKUP_DATA_FIELDS.every((field) => Object.hasOwn(backup.data, field))) {
    throw new Error("The backup is missing required local data or contains unsupported fields.");
  }

  const { activities, checkIns, recoveryDates, guardrailEvents, profile } = backup.data;
  if (!Array.isArray(activities) || activities.length > 500 || !activities.every(isValidActivity)) {
    throw new Error("The backup contains invalid activity records.");
  }
  if (!isValidCheckIns(checkIns)) {
    throw new Error("The backup contains invalid hip check-ins.");
  }
  if (!Array.isArray(recoveryDates) || !recoveryDates.every(isIsoDate)) {
    throw new Error("The backup contains invalid recovery dates.");
  }
  if (!Array.isArray(guardrailEvents) || guardrailEvents.length > 20 || !guardrailEvents.every(isValidGuardrailEvent)) {
    throw new Error("The backup contains invalid pace guardrail records.");
  }
  if (!isRecord(profile)
    || !Number.isInteger(profile.age) || !isPositiveNumber(profile.age)
    || !isPositiveNumber(profile.heightCm)
    || !isPositiveNumber(profile.weightKg)) {
    throw new Error("The backup contains an invalid training profile.");
  }

  return backup.data;
}
