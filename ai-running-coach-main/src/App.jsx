import React, { useEffect, useMemo, useState } from "react";
import { createLocalBackup, LOCAL_DATA_KEYS, parseLocalBackup } from "./localBackup.js";
import {
  DEFAULT_MARATHON_GOAL_PACE,
  marathonTimeAtPace,
  parsePaceInput,
  suggestedQualityPaceForWeek,
} from "./paceProgression.js";
import { EASY_PACE_MAX, EASY_PACE_MIN, PHASES, PLAN_START, TOTAL_WEEKS, TRAINING_PLAN, getWorkoutForDate, phaseForWeek, qualityNoteForWeek, round1 } from "./plan.js";

/*
 * AI Running Coach — single-file React SPA
 *
 * Requirements:
 * - React 18+ and Tailwind CSS configured in the host project.
 * - No charting, icon, router, or UI libraries are required.
 * - Training logs, check-ins, OAuth demo state, and settings are stored in LocalStorage.
 *
 * Strava OAuth and token handling run in the Vercel API routes; only activity summaries
 * and connection metadata are exposed to this browser app.
 */

const PROFILE = { age: 25, heightCm: 170, weightKg: 91, marathonGoalPace: DEFAULT_MARATHON_GOAL_PACE };

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function getPlanWeekForDate(date) {
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utcStart = Date.UTC(PLAN_START.getFullYear(), PLAN_START.getMonth(), PLAN_START.getDate());
  const elapsedDays = Math.floor((utcDate - utcStart) / 86400000);
  const calculatedWeek = Math.floor(elapsedDays / 7) + 1;
  return Math.max(1, Math.min(TOTAL_WEEKS, calculatedWeek));
}

function formatDate(date, options = { day: "2-digit", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

function formatDateRange(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    const startLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(start);
    const endLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(end);
    return `${startLabel} – ${endLabel}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatPace(decimalMinutes) {
  if (!Number.isFinite(decimalMinutes) || decimalMinutes <= 0) return "—";
  const wholeMinutes = Math.floor(decimalMinutes);
  const seconds = Math.round((decimalMinutes - wholeMinutes) * 60);
  const normalizedMinutes = seconds === 60 ? wholeMinutes + 1 : wholeMinutes;
  const normalizedSeconds = seconds === 60 ? 0 : seconds;
  return `${String(normalizedMinutes).padStart(2, "0")}:${String(normalizedSeconds).padStart(2, "0")}`;
}

function formatDuration(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "—";
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes} min`;
}

function getCalendarWorkoutForDate(date, checkIns, recoveryDates, goalPace) {
  const planEnd = TRAINING_PLAN[TOTAL_WEEKS - 1].end;
  const dateIso = toLocalISODate(date);
  if (dateIso < toLocalISODate(PLAN_START) || dateIso > toLocalISODate(planEnd)) return null;

  const week = getPlanWeekForDate(date);
  const weekRow = TRAINING_PLAN[week - 1];
  const checkIn = checkIns[String(week)];
  const lockReason = checkIn && checkIn.status !== "AMAN"
    ? `Check-in mingguan berstatus ${checkIn.status}: pakai Istirahat / Pemulihan sepanjang minggu dan batasi volume 75%.`
    : recoveryDates.includes(toLocalISODate(date))
      ? "A recent activity was faster than the easy-pace guardrail. This date is reserved for recovery; do not replace it with another workout."
      : "";

  return {
    week,
    weekRow,
    hipLock: Boolean(checkIn && checkIn.status !== "AMAN"),
    workout: getWorkoutForDate(date, weekRow, lockReason, goalPace),
  };
}

function assessHipStatus({ clicking, painScore, symptoms }) {
  const symptomText = String(symptoms || "").toLowerCase();
  const redFlagTerms = [
    "limp",
    "cannot bear weight",
    "can't bear weight",
    "unable to bear weight",
    "swelling",
    "hot joint",
    "night pain",
    "pain at rest",
    "rest pain",
    "sharp pain",
    "numbness","pincang","bengkak","nyeri dada","sesak","pingsan","pusing berat","berdebar","nyeri malam","nyeri tajam",
  ];
  const hasRedFlag = redFlagTerms.some((term) => symptomText.includes(term));
  if (Number(painScore) >= 5 || hasRedFlag) return "PERIKSA";
  if (clicking === "Yes" || Number(painScore) > 0 || String(symptoms || "").trim()) return "WASPADA";
  return "AMAN";
}

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : JSON.parse(stored);
    } catch (error) {
      console.warn(`Unable to read LocalStorage key "${key}".`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Unable to save LocalStorage key "${key}".`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-600 bg-slate-800 text-slate-200",
    emerald: "border-emerald-700/70 bg-emerald-950/70 text-emerald-300",
    amber: "border-amber-700/70 bg-amber-950/70 text-amber-300",
    red: "border-red-700/70 bg-red-950/70 text-red-300",
    blue: "border-sky-700/70 bg-sky-950/70 text-sky-300",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${tones[tone] || tones.slate}`}>{children}</span>;
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";
const buttonClass = "inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass = "inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

async function readApiResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The Strava server returned an invalid response.");
  }
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "The Strava request failed.");
  }
  return payload;
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const activeWeek = getPlanWeekForDate(today);
  const activeWeekRow = TRAINING_PLAN[activeWeek - 1];
  const tomorrowWeek = getPlanWeekForDate(tomorrow);
  const tomorrowWeekRow = TRAINING_PLAN[tomorrowWeek - 1];

  const [activities, setActivities] = useLocalStorageState(LOCAL_DATA_KEYS.activities, []);
  const [checkIns, setCheckIns] = useLocalStorageState(LOCAL_DATA_KEYS.checkIns, {});
  const [recoveryDates, setRecoveryDates] = useLocalStorageState(LOCAL_DATA_KEYS.recoveryDates, []);
  const [guardrailEvents, setGuardrailEvents] = useLocalStorageState(LOCAL_DATA_KEYS.guardrailEvents, []);
  const [profile, setProfile] = useLocalStorageState(LOCAL_DATA_KEYS.profile, PROFILE);
  const [weightInput, setWeightInput] = useState(String(profile.weightKg));
  const [goalPaceInput, setGoalPaceInput] = useState(formatPace(profile.marathonGoalPace ?? DEFAULT_MARATHON_GOAL_PACE));
  const [goalPaceFeedback, setGoalPaceFeedback] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [activityForm, setActivityForm] = useState({ distance: "", duration: "", heartRate: "" });
  const [logFeedback, setLogFeedback] = useState(null);
  const [hipForm, setHipForm] = useState({ clicking: "No", painScore: 0, symptoms: "" });
  const [hipFeedback, setHipFeedback] = useState("");
  const [stravaStatus, setStravaStatus] = useState({
    loading: true,
    configured: false,
    connected: false,
    athlete: null,
  });
  const [stravaBusy, setStravaBusy] = useState(false);
  const [stravaMessage, setStravaMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toLocalISODate(today));

  const activeCheckIn = checkIns[String(activeWeek)] || null;
  const tomorrowCheckIn = checkIns[String(tomorrowWeek)] || null;
  const activeHipLock = Boolean(activeCheckIn && activeCheckIn.status !== "AMAN");
  const tomorrowHipLock = Boolean(tomorrowCheckIn && tomorrowCheckIn.status !== "AMAN");
  const tomorrowPaceLock = recoveryDates.includes(toLocalISODate(tomorrow));
  const tomorrowLockReason = tomorrowHipLock
    ? `Check-in mingguan berstatus ${tomorrowCheckIn.status}: pakai Istirahat / Pemulihan sepanjang minggu dan batasi volume 75%.`
    : tomorrowPaceLock
      ? "A recent activity was faster than the easy-pace guardrail. Tomorrow is reserved for recovery; do not replace it with another workout."
      : "";
  const marathonGoalPace = profile.marathonGoalPace ?? DEFAULT_MARATHON_GOAL_PACE;
  const tomorrowWorkout = getWorkoutForDate(tomorrow, tomorrowWeekRow, tomorrowLockReason, marathonGoalPace);
  const activeVolume = round1(activeWeekRow.targetVolume * (activeHipLock ? 0.75 : 1));
  const tomorrowVolume = round1(tomorrowWeekRow.targetVolume * (tomorrowHipLock ? 0.75 : 1));
  const tomorrowDurationRange = tomorrowWorkout.distance > 0
    ? `${formatDuration(tomorrowWorkout.distance * EASY_PACE_MIN)} – ${formatDuration(tomorrowWorkout.distance * EASY_PACE_MAX)}`
    : "No running duration prescribed";
  const parsedWeightKg = Number(weightInput);
  const isWeightValid = weightInput.trim() !== "" && Number.isFinite(parsedWeightKg) && parsedWeightKg > 0;
  const profileBMI = isWeightValid
    ? parsedWeightKg / Math.pow(profile.heightCm / 100, 2)
    : null;

  useEffect(() => {
    let active = true;
    const callbackResult = new URLSearchParams(window.location.search).get("strava");
    if (callbackResult) {
      const callbackMessages = {
        connected: "Strava connected securely. You can now import your recent runs.",
        denied: "Strava authorization was cancelled.",
        failed: "Strava could not complete authorization. Check the server setup and try again.",
      };
      setStravaMessage(callbackMessages[callbackResult] || "Strava authorization was not completed.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetch("/api/strava/status")
      .then(readApiResponse)
      .then((status) => {
        if (!active) return;
        setStravaStatus({
          loading: false,
          configured: Boolean(status.configured),
          connected: Boolean(status.connected),
          athlete: status.athlete || null,
        });
        if (status.error) setStravaMessage(status.error);
        else if (!status.configured) {
          setStravaMessage("Live Strava connection requires the Vercel deployment and its server environment variables.");
        }
      })
      .catch(() => {
        if (!active) return;
        setStravaStatus({ loading: false, configured: false, connected: false, athlete: null });
        setStravaMessage("The Strava API is unavailable here. Deploy this app to Vercel and configure its server environment variables.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeCheckIn) {
      setHipForm({
        clicking: activeCheckIn.clicking,
        painScore: activeCheckIn.painScore,
        symptoms: activeCheckIn.symptoms,
      });
      setHipFeedback("");
    } else {
      setHipForm({ clicking: "No", painScore: 0, symptoms: "" });
      setHipFeedback("");
    }
  }, [activeWeek, activeCheckIn]);

  const liveHipStatus = assessHipStatus(hipForm);
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const dayCount = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const cellCount = Math.ceil((mondayOffset + dayCount) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const day = index - mondayOffset + 1;
      return day < 1 || day > dayCount
        ? null
        : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    });
  }, [calendarMonth]);
  const selectedCalendarDateObject = new Date(`${selectedCalendarDate}T12:00:00`);
  const selectedCalendarEntry = getCalendarWorkoutForDate(
    selectedCalendarDateObject,
    checkIns,
    recoveryDates,
    marathonGoalPace,
  );
  const calculatedPace = useMemo(() => {
    const distance = Number(activityForm.distance);
    const duration = Number(activityForm.duration);
    if (distance > 0 && duration > 0) return duration / distance;
    return null;
  }, [activityForm.distance, activityForm.duration]);

  const coachAdvice = useMemo(() => {
    if (tomorrowWorkout.locked && tomorrowHipLock) {
      return "Your hip check-in takes priority over the schedule. Do not test the hip with a run. Use pain-free daily movement only; persistent, worsening, or function-limiting symptoms warrant assessment by a qualified clinician.";
    }
    if (tomorrowWorkout.locked && tomorrowPaceLock) {
      return "The pace guardrail has deliberately removed tomorrow's run. Recovery is part of the plan: sleep, eat normally, hydrate, and resume only when you feel recovered.";
    }
    if (tomorrowWorkout.type === "Quality") {
      return "Keep the easy portions genuinely easy. The controlled segment is optional and should feel comfortably controlled, never like a race. Stop if pain changes your stride.";
    }
    return `At age ${profile.age}, ${profile.heightCm} cm, and ${profile.weightKg} kg (BMI ${(profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)}), the priority is repeatable training rather than pace-chasing. Use the talk test, especially in warm or humid conditions; maintain two light strength sessions when recovered, and protect sleep and fueling. BMI is context only, not a performance target.`;
  }, [tomorrowWorkout, tomorrowHipLock, tomorrowPaceLock, profile]);

  function handleActivitySubmit(event) {
    event.preventDefault();
    const distance = Number(activityForm.distance);
    const duration = Number(activityForm.duration);
    const heartRate = Number(activityForm.heartRate);
    if (!Number.isFinite(distance) || distance <= 0 || distance > 100) {
      setLogFeedback({ tone: "red", text: "Enter a distance greater than 0 and no more than 100 km." });
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1440) {
      setLogFeedback({ tone: "red", text: "Enter a duration greater than 0 and no more than 1,440 minutes." });
      return;
    }
    if (!Number.isFinite(heartRate) || heartRate < 30 || heartRate > 230) {
      setLogFeedback({ tone: "red", text: "Enter a heart rate between 30 and 230 bpm." });
      return;
    }

    const pace = duration / distance;
    const activityId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `activity-${Date.now()}`;
    const activity = {
      id: activityId,
      source: "manual",
      date: toLocalISODate(today),
      week: activeWeek,
      distance: round1(distance),
      durationMinutes: round1(duration),
      paceMinutes: pace,
      pace: formatPace(pace),
      heartRate: Math.round(heartRate),
      loggedAt: new Date().toISOString(),
    };
    setActivities((current) => [activity, ...current].slice(0, 500));

    if (pace < activeWeekRow.easyPaceMin) {
      const recoveryDate = toLocalISODate(tomorrow);
      setRecoveryDates((current) => Array.from(new Set([...current, recoveryDate])));
      const eventRecord = {
        id: `guardrail-${Date.now()}`,
        date: toLocalISODate(today),
        recoveryDate,
        pace: formatPace(pace),
        limit: formatPace(activeWeekRow.easyPaceMin),
        distance: round1(distance),
      };
      setGuardrailEvents((current) => [eventRecord, ...current].slice(0, 20));
      setLogFeedback({
        tone: "amber",
        text: `Pace guardrail triggered: ${formatPace(pace)} min/km is faster than this week's ${formatPace(activeWeekRow.easyPaceMin)} min/km easy-pace limit. Tomorrow (${formatDate(tomorrow)}) is now locked to Rest / Recovery.`,
      });
    } else if (pace > activeWeekRow.easyPaceMax) {
      setLogFeedback({
        tone: "emerald",
        text: `Activity saved at ${formatPace(pace)} min/km. This is slower than the prescribed pace band; that is not an overpacing alert. Keep effort conversational and account for heat, hills, and fatigue.`,
      });
    } else {
      setLogFeedback({
        tone: "emerald",
        text: `Activity saved at ${formatPace(pace)} min/km, inside the ${formatPace(activeWeekRow.easyPaceMin)}–${formatPace(activeWeekRow.easyPaceMax)} min/km easy-pace band.`,
      });
    }
    setActivityForm({ distance: "", duration: "", heartRate: "" });
  }

  function handleHipSubmit(event) {
    event.preventDefault();
    const status = assessHipStatus(hipForm);
    const record = {
      ...hipForm,
      painScore: Number(hipForm.painScore),
      status,
      week: activeWeek,
      savedAt: new Date().toISOString(),
    };
    setCheckIns((current) => ({ ...current, [String(activeWeek)]: record }));
    if (status === "AMAN") {
      setHipFeedback("Status AMAN. Keep the planned week, remain within the easy-pace range, and continue monitoring symptoms.");
    } else if (status === "WASPADA") {
      setHipFeedback("Status WASPADA. The active week's running is locked to Rest / Recovery and its volume cap is reduced by 25%. Recheck symptoms before resuming structured running.");
    } else {
      setHipFeedback("Status PERIKSA. The active week's running is locked to Rest / Recovery and its volume cap is reduced by 25%. Arrange an assessment with a qualified sports-health clinician before returning to running.");
    }
  }

  function exportLocalBackup() {
    const backup = createLocalBackup({ activities, checkIns, recoveryDates, guardrailEvents, profile });
    const fileUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `ai-running-coach-backup-${toLocalISODate(today)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(fileUrl), 0);
    setBackupMessage("Local training records and profile exported. Strava connection cookies are not included.");
  }

  async function importLocalBackup(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const data = parseLocalBackup(await file.text());
      if (!window.confirm("Importing this backup replaces the local activities, check-ins, recovery dates, guardrail history, and training profile in this browser. Continue?")) {
        setBackupMessage("Backup import cancelled; existing local data was not changed.");
        return;
      }

      const entries = Object.entries(LOCAL_DATA_KEYS).map(([field, key]) => [key, data[field]]);
      const previousValues = entries.map(([key]) => window.localStorage.getItem(key));
      try {
        entries.forEach(([key, value]) => window.localStorage.setItem(key, JSON.stringify(value)));
      } catch (error) {
        try {
          entries.forEach(([key], index) => {
            const previousValue = previousValues[index];
            if (previousValue === null) window.localStorage.removeItem(key);
            else window.localStorage.setItem(key, previousValue);
          });
        } catch (rollbackError) {
          console.error("Unable to fully restore LocalStorage after a failed backup import.", rollbackError);
        }
        throw new Error("The backup could not be saved to this browser's storage. Existing data was restored where possible.");
      }

      setActivities(data.activities);
      setCheckIns(data.checkIns);
      setRecoveryDates(data.recoveryDates);
      setGuardrailEvents(data.guardrailEvents);
      setProfile(data.profile);
      setWeightInput(String(data.profile.weightKg));
      const importedGoalPace = data.profile.marathonGoalPace ?? DEFAULT_MARATHON_GOAL_PACE;
      setGoalPaceInput(formatPace(importedGoalPace));
      setGoalPaceFeedback("");
      setBackupMessage("Backup imported. The previous local records and profile were replaced.");
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "The backup could not be imported.");
    } finally {
      input.value = "";
    }
  }

  function saveMarathonGoalPace(event) {
    event.preventDefault();
    const pace = parsePaceInput(goalPaceInput);
    if (pace === null) {
      setGoalPaceFeedback("Enter a pace from 05:00 to 15:00 min/km, for example 07:30.");
      return;
    }

    setProfile((current) => ({ ...current, marathonGoalPace: pace }));
    setGoalPaceFeedback("Goal pace saved. Monthly quality suggestions update; easy-run guidance stays unchanged.");
  }

  async function connectStrava() {
    setStravaBusy(true);
    setStravaMessage("");
    try {
      const response = await fetch("/api/strava/connect", { method: "POST" });
      const payload = await readApiResponse(response);
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setStravaMessage(error.message);
      setStravaBusy(false);
    }
  }

  async function importStravaActivities() {
    setStravaBusy(true);
    setStravaMessage("");
    try {
      const response = await fetch("/api/strava/activities");
      const payload = await readApiResponse(response);
      const imported = payload.activities.map((activity) => {
        const distance = activity.distanceKm;
        const duration = activity.durationMinutes;
        const pace = duration / distance;
        return {
          id: `strava-${activity.id}`,
          source: "Strava",
          name: activity.name,
          date: activity.date,
          week: getPlanWeekForDate(new Date(`${activity.date}T12:00:00`)),
          distance: round1(distance),
          durationMinutes: round1(duration),
          paceMinutes: pace,
          pace: formatPace(pace),
          heartRate: activity.heartRate,
          loggedAt: new Date().toISOString(),
        };
      });
      const existingIds = new Set(activities.map((activity) => activity.id));
      const newActivities = imported.filter((activity) => !existingIds.has(activity.id));
      setActivities((current) => {
        const currentIds = new Set(current.map((activity) => activity.id));
        return [
          ...newActivities.filter((activity) => !currentIds.has(activity.id)),
          ...current,
        ].slice(0, 500);
      });
      const todayDate = toLocalISODate(today);
      const overpacedToday = newActivities.filter(
        (activity) => activity.date === todayDate && activity.paceMinutes < activeWeekRow.easyPaceMin,
      );
      if (overpacedToday.length) {
        const recoveryDate = toLocalISODate(tomorrow);
        setRecoveryDates((current) => Array.from(new Set([...current, recoveryDate])));
        setGuardrailEvents((current) => {
          const knownIds = new Set(current.map((event) => event.id));
          const newEvents = overpacedToday
            .filter((activity) => !knownIds.has(`strava-guardrail-${activity.id}`))
            .map((activity) => ({
              id: `strava-guardrail-${activity.id}`,
              date: activity.date,
              recoveryDate,
              pace: activity.pace,
              limit: formatPace(activeWeekRow.easyPaceMin),
              distance: activity.distance,
            }));
          return [...newEvents, ...current].slice(0, 20);
        });
        setStravaMessage(`Imported ${newActivities.length} new ${newActivities.length === 1 ? "run" : "runs"}. Today's Strava run was faster than the app's easy-pace threshold, so tomorrow is locked to recovery.`);
      } else {
        setStravaMessage(newActivities.length
          ? `Imported ${newActivities.length} recent Strava ${newActivities.length === 1 ? "run" : "runs"}. Imported activities are saved in this browser.`
          : "No new Strava runs to import. Recent run records are already saved in this browser.");
      }
    } catch (error) {
      setStravaMessage(error.message);
    } finally {
      setStravaBusy(false);
    }
  }

  async function disconnectStrava() {
    setStravaBusy(true);
    setStravaMessage("");
    try {
      const response = await fetch("/api/strava/disconnect", { method: "POST" });
      await readApiResponse(response);
      setStravaStatus((current) => ({ ...current, connected: false, athlete: null }));
      setStravaMessage("Strava has been disconnected from this browser.");
    } catch (error) {
      setStravaMessage(error.message);
    } finally {
      setStravaBusy(false);
    }
  }

  const filteredPlan = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return TRAINING_PLAN.filter((row) => {
      const matchesPhase = phaseFilter === "all" || row.phase === phaseFilter;
      if (!matchesPhase) return false;
      if (!term) return true;
      const searchable = [
        row.week,
        formatDateRange(row.start, row.end),
        row.phase,
        row.targetVolume,
        `${formatPace(row.easyPaceMin)}-${formatPace(row.easyPaceMax)}`,
        formatPace(suggestedQualityPaceForWeek(row.week, marathonGoalPace) || 0),
        qualityNoteForWeek(row.week, phaseForWeek(row.week), marathonGoalPace),
      ].join(" ").toLowerCase();
      return searchable.includes(term);
    });
  }, [searchTerm, phaseFilter, marathonGoalPace]);

  const recentActivities = activities.slice(0, 6);
  const currentPhase = phaseForWeek(activeWeek);
  const statusTone = (status) => status === "AMAN" ? "emerald" : status === "WASPADA" ? "amber" : status === "PERIKSA" ? "red" : "slate";
  const calendarMonthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth);
  const calendarTypeTone = {
    Easy: "border-emerald-900/70 bg-emerald-950/50 text-emerald-300",
    Quality: "border-sky-900/70 bg-sky-950/50 text-sky-300",
    "Long easy": "border-violet-900/70 bg-violet-950/50 text-violet-300",
    Strength: "border-amber-900/70 bg-amber-950/50 text-amber-300",
    "Cross-training": "border-amber-900/70 bg-amber-950/50 text-amber-300",
    Recovery: "border-red-900/70 bg-red-950/50 text-red-300",
    Rest: "border-slate-800 bg-slate-900 text-slate-500",
    Race: "border-fuchsia-900/70 bg-fuchsia-950/50 text-fuchsia-300",
    Shakeout: "border-emerald-900/70 bg-emerald-950/50 text-emerald-300",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-400/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-slate-800 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="emerald">3-YEAR COACHING PLAN</Badge>
              <Badge tone="slate">LOCAL-FIRST DEMO</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">AI Running Coach</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Rencana latihan 3 tahun menuju marathon 2029: turun berat badan, basis aerobik, lalu blok maraton 18 minggu. Data tersimpan di browser ini.
            </p>
          </div>
          <div className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm md:w-auto">
            <div className="text-xs uppercase tracking-wider text-slate-500">Training date</div>
            <div className="mt-1 font-semibold text-slate-100">{formatDate(today, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
            <div className="mt-1 text-xs text-slate-500">Rencana: 09 Nov 2026 – {formatDate(TRAINING_PLAN[TOTAL_WEEKS - 1].end)}</div>
          </div>
        </header>

        <main className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active week</div>
              <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-bold text-white">{activeWeek}</span><span className="text-sm text-slate-500">/ {TOTAL_WEEKS}</span></div>
              <div className="mt-2 text-sm text-slate-300">{currentPhase.name}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Baseline weekly target</div>
              <div className="mt-2 text-3xl font-bold text-white">{activeWeekRow.targetVolume.toFixed(1)} <span className="text-sm font-medium text-slate-500">km</span></div>
              <div className="mt-2 text-sm text-slate-400">{formatDateRange(activeWeekRow.start, activeWeekRow.end)}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current volume cap</div>
              <div className="mt-2 text-3xl font-bold text-white">{activeVolume.toFixed(1)} <span className="text-sm font-medium text-slate-500">km</span></div>
              <div className="mt-2 text-sm text-slate-400">{activeHipLock ? "Batas 75% berlaku setelah check-in" : "Tanpa pengurangan beban dari check-in"}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Easy-pace guardrail</div>
              <div className="mt-2 text-2xl font-bold text-emerald-300">{formatPace(activeWeekRow.easyPaceMin)}–{formatPace(activeWeekRow.easyPaceMax)}</div>
              <div className="mt-2 text-sm text-slate-400">min/km · faster than {formatPace(activeWeekRow.easyPaceMin)} triggers recovery</div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Panel
              title="Catatan pelatih harian"
              subtitle={`Tomorrow’s workout · ${formatDate(tomorrow, { weekday: "long", day: "2-digit", month: "long" })} · Week ${tomorrowWeek} · ${tomorrowWeekRow.phase}`}
              action={tomorrowWorkout.locked ? <Badge tone="amber">RECOVERY LOCK</Badge> : <Badge tone="emerald">COACH PLAN</Badge>}
              className="border-emerald-900/50 bg-gradient-to-br from-slate-900 to-slate-900/80"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{tomorrowWorkout.title}</div>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{tomorrowWorkout.note}</p>
                </div>
                <div className="min-w-36 rounded-xl border border-slate-700 bg-slate-950/70 p-3 sm:text-right">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Target distance</div>
                  <div className="mt-1 text-2xl font-bold text-white">{tomorrowWorkout.distance.toFixed(1)} <span className="text-sm font-medium text-slate-500">km</span></div>
                  <div className="mt-1 text-xs text-slate-500">{tomorrowDurationRange}</div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Locked easy pace range</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-300">{formatPace(tomorrowWeekRow.easyPaceMin)}–{formatPace(tomorrowWeekRow.easyPaceMax)} min/km</div>
                  <div className="mt-1 text-xs text-slate-500">Do not chase a faster split; use the talk test.</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Weekly volume cap</div>
                  <div className="mt-1 text-lg font-semibold text-white">{tomorrowVolume.toFixed(1)} km</div>
                  <div className="mt-1 text-xs text-slate-500">{tomorrowHipLock ? "Dikurangi 25% oleh check-in" : "Berdasarkan rencana 157 minggu"}</div>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Coach advice · biometrics-aware</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{coachAdvice}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Status check-in:</span>
                {tomorrowCheckIn ? <Badge tone={statusTone(tomorrowCheckIn.status)}>{tomorrowCheckIn.status}</Badge> : <Badge>Not checked in</Badge>}
                {tomorrowPaceLock ? <Badge tone="amber">Pace guardrail recovery day</Badge> : null}
              </div>
            </Panel>

            <Panel title="Profil latihan" subtitle="Biometrics used as context for conservative coaching advice.">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-950 p-3"><div className="text-xs text-slate-500">Age</div><div className="mt-1 text-xl font-bold">{profile.age}</div><div className="text-xs text-slate-500">years</div></div>
                <div className="rounded-xl bg-slate-950 p-3"><div className="text-xs text-slate-500">Height</div><div className="mt-1 text-xl font-bold">{profile.heightCm}</div><div className="text-xs text-slate-500">cm</div></div>
                <div className="rounded-xl bg-slate-950 p-3">
                  <label htmlFor="profile-weight" className="text-xs text-slate-500">Weight</label>
                  <input
                    id="profile-weight"
                    className={`${inputClass} mt-1 text-xl font-bold`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={weightInput}
                    aria-invalid={!isWeightValid}
                    aria-describedby={isWeightValid ? undefined : "profile-weight-hint"}
                    onChange={(event) => {
                      const value = event.target.value;
                      setWeightInput(value);
                      const weightKg = Number(value);
                      if (value.trim() !== "" && Number.isFinite(weightKg) && weightKg > 0) {
                        setProfile((current) => ({ ...current, weightKg }));
                      }
                    }}
                  />
                  <div className="text-xs text-slate-500">kg</div>
                  {!isWeightValid ? <div id="profile-weight-hint" className="mt-1 text-xs text-amber-300">Enter a weight greater than 0 kg.</div> : null}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 p-3">
                <div><div className="text-xs text-slate-500">Calculated BMI</div><div className="mt-1 text-xl font-semibold text-slate-100">{profileBMI === null ? "—" : profileBMI.toFixed(1)}</div></div>
                <Badge tone="slate">Context only</Badge>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">BMI does not determine running pace, readiness, or injury risk. Pace targets should be reassessed with training evidence and qualified coaching input, not automatically accelerated.</p>
              <div className="mt-4 rounded-xl border border-slate-800 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current phase focus</div>
                <p className="mt-1 text-sm leading-6 text-slate-300">{currentPhase.focus}</p>
              </div>
              <form onSubmit={saveMarathonGoalPace} className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="space-y-1.5">
                  <label htmlFor="marathon-goal-pace" className="block text-sm font-medium text-slate-300">Aspirational marathon goal pace</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="marathon-goal-pace"
                      className={`${inputClass} max-w-36`}
                      type="text"
                      inputMode="numeric"
                      value={goalPaceInput}
                      aria-label="Marathon goal pace in minutes and seconds per kilometer"
                      onChange={(event) => setGoalPaceInput(event.target.value)}
                    />
                    <span className="text-sm text-slate-400">min/km</span>
                    <button type="submit" className={secondaryButtonClass}>Save</button>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">Editable race-day aspiration, not a forecast or promise. It changes optional quality-session suggestions only; easy runs stay at the separate easy-pace range.</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-sky-300">
                  {formatPace(marathonGoalPace)} min/km · about {marathonTimeAtPace(marathonGoalPace)} for 42.195 km
                </p>
                {goalPaceFeedback ? <p role="status" className="mt-2 text-xs leading-5 text-slate-400">{goalPaceFeedback}</p> : null}
                <p className="mt-2 text-xs leading-5 text-slate-500">Optional steady-segment suggestions move in four-week blocks from about 09:30/km toward this goal starting in week 53. Cutback, taper, and race weeks do not add pace work. Suggestions are never automatic workout requirements.</p>
              </form>
            </Panel>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Check-in mingguan (Senin)" subtitle={`Week ${activeWeek} · Save one check-in per active week. Any non-AMAN status locks running to recovery and reduces the week's volume cap by 25%.`}>
              <form onSubmit={handleHipSubmit} className="space-y-4">
                <Field label="Tekanan darah rumahan 140/90 atau lebih minggu ini?" hint="Pilih Yes bila rata-rata pengukuran rumah Anda 140/90 atau lebih. Status non-AMAN mengunci lari minggu ini ke pemulihan dan mengurangi volume 25%.">
                  <select className={inputClass} value={hipForm.clicking} onChange={(event) => setHipForm((current) => ({ ...current, clicking: event.target.value }))}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </Field>
                <Field label={`Pain score: ${hipForm.painScore} / 10`} hint="0 = no pain; 10 = worst imaginable pain. A score of 5 or more triggers PERIKSA.">
                  <input className="w-full accent-emerald-400" type="range" min="0" max="10" step="1" value={hipForm.painScore} onChange={(event) => setHipForm((current) => ({ ...current, painScore: Number(event.target.value) }))} />
                  <div className="flex justify-between text-xs text-slate-500"><span>0 · None</span><span>5 · Moderate</span><span>10 · Severe</span></div>
                </Field>
                <Field label="Gejala (nyeri dada, sesak, pusing, nyeri tajam, bengkak, pincang)" hint="Describe location, onset, duration, stiffness, pain during walking/running, or any change in your stride.">
                  <textarea className={`${inputClass} min-h-24 resize-y`} value={hipForm.symptoms} onChange={(event) => setHipForm((current) => ({ ...current, symptoms: event.target.value }))} />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500">Live evaluation</div>
                    <div className="mt-1"><Badge tone={statusTone(liveHipStatus)}>{liveHipStatus}</Badge></div>
                  </div>
                  <span className="max-w-xs text-right text-xs leading-5 text-slate-500">{liveHipStatus === "AMAN" ? "No reported warning signs in this form." : liveHipStatus === "WASPADA" ? "Modify training and monitor symptoms." : "Stop running and seek clinical assessment."}</span>
                </div>
                <button type="submit" className={buttonClass}>Save Week {activeWeek} Check-in</button>
              </form>
              {activeCheckIn ? (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Saved status</span><Badge tone={statusTone(activeCheckIn.status)}>{activeCheckIn.status}</Badge></div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{activeCheckIn.status === "AMAN" ? "The plan remains available; continue monitoring the hip." : "Running sessions for this active week are locked to Rest / Recovery. Weekly volume is capped at 75% of the base plan."}</p>
                  {activeCheckIn.status === "PERIKSA" ? <p className="mt-2 text-xs leading-5 text-red-300">A form status is not a diagnosis. Arrange an in-person assessment, especially with significant pain, swelling, limping, night/rest pain, or difficulty bearing weight.</p> : null}
                </div>
              ) : <p className="mt-3 text-xs text-slate-500">No check-in saved for the active week yet. The live evaluation above is a preview until you save it.</p>}
              {hipFeedback ? <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-300">{hipFeedback}</p> : null}
            </Panel>

            <Panel
              title="Connect Strava Account"
              subtitle="Authorize the server to read your activity, then import your 30 most recent runs. OAuth tokens remain server-side."
              action={stravaStatus.loading
                ? <Badge>CHECKING</Badge>
                : stravaStatus.connected
                  ? <Badge tone="emerald">CONNECTED</Badge>
                  : stravaStatus.configured
                    ? <Badge>NOT CONNECTED</Badge>
                    : <Badge tone="amber">SETUP REQUIRED</Badge>}
            >
              <div className="space-y-4">
                {stravaStatus.athlete ? (
                  <p className="text-sm text-slate-300">
                    Connected as {[stravaStatus.athlete.firstName, stravaStatus.athlete.lastName].filter(Boolean).join(" ") || "Strava athlete"}.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {!stravaStatus.connected ? (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={connectStrava}
                      disabled={stravaBusy || stravaStatus.loading || !stravaStatus.configured}
                    >
                      {stravaBusy ? "Connecting..." : "Connect with Strava"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={importStravaActivities}
                        disabled={stravaBusy}
                      >
                        {stravaBusy ? "Working..." : "Import recent runs"}
                      </button>
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        onClick={disconnectStrava}
                        disabled={stravaBusy}
                      >
                        Disconnect Strava
                      </button>
                    </>
                  )}
                </div>
                {stravaMessage ? <p className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-300">{stravaMessage}</p> : null}
                <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-xs leading-5 text-amber-200/90">
                  The server stores Strava tokens in an encrypted, HttpOnly cookie. Imported run summaries are saved in this browser; disconnecting revokes the Strava grant and clears the session.
                </div>
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Catat aktivitas" subtitle="Log a completed run locally. Pace is calculated from duration ÷ distance; heart rate is recorded as the session average.">
              <form onSubmit={handleActivitySubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Jarak (km)">
                    <input className={inputClass} type="number" min="0.1" max="100" step="0.1" value={activityForm.distance} onChange={(event) => setActivityForm((current) => ({ ...current, distance: event.target.value }))} />
                  </Field>
                  <Field label="Waktu (menit)" hint="Total elapsed duration, including walk breaks.">
                    <input className={inputClass} type="number" min="1" max="1440" step="0.1" value={activityForm.duration} onChange={(event) => setActivityForm((current) => ({ ...current, duration: event.target.value }))} />
                  </Field>
                  <Field label="Pace (min/km)">
                    <input className={`${inputClass} cursor-not-allowed text-emerald-300`} value={calculatedPace ? `${formatPace(calculatedPace)} min/km` : "Enter distance and time"} readOnly />
                  </Field>
                  <Field label="Detak jantung rata-rata (bpm)">
                    <input className={inputClass} type="number" min="30" max="230" step="1" value={activityForm.heartRate} onChange={(event) => setActivityForm((current) => ({ ...current, heartRate: event.target.value }))} />
                  </Field>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-400">
                  Pace guardrail: a recorded average faster than <span className="font-semibold text-emerald-300">{formatPace(activeWeekRow.easyPaceMin)} min/km</span> triggers tomorrow's recovery lock. This fixed planning rule is a conservative prompt, not a medical assessment or injury prediction.
                </div>
                <button type="submit" className={buttonClass}>Save activity & check pace</button>
              </form>
              {logFeedback ? (
                <div className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${logFeedback.tone === "amber" ? "border-amber-800 bg-amber-950/30 text-amber-200" : logFeedback.tone === "red" ? "border-red-800 bg-red-950/30 text-red-200" : "border-emerald-900 bg-emerald-950/20 text-emerald-200"}`}>
                  {logFeedback.text}
                </div>
              ) : null}
            </Panel>

            <Panel title="Aktivitas terakhir" subtitle={`${activities.length} locally stored ${activities.length === 1 ? "activity" : "activities"}. Manual entries and imported Strava runs are kept in this browser's LocalStorage.`}>
              {recentActivities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center">
                  <p className="text-sm font-medium text-slate-300">No activities logged yet</p>
                  <p className="mt-1 text-xs text-slate-500">Use the activity logger to record distance, time, pace, and heart rate.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3 pr-3 font-medium">Date</th><th className="pb-3 pr-3 font-medium">Distance</th><th className="pb-3 pr-3 font-medium">Time</th><th className="pb-3 pr-3 font-medium">Pace</th><th className="pb-3 font-medium">HR</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {recentActivities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="py-3 pr-3 text-slate-400">
                            <div>{activity.date}</div>
                            <div className="text-xs text-slate-500">{activity.source === "Strava" ? activity.name : "Manual"}</div>
                          </td>
                          <td className="py-3 pr-3 font-medium text-slate-200">{activity.distance.toFixed(1)} km</td>
                          <td className="py-3 pr-3 text-slate-300">{formatDuration(activity.durationMinutes)}</td>
                          <td className="py-3 pr-3"><span className={activity.paceMinutes < EASY_PACE_MIN ? "font-semibold text-amber-300" : "text-emerald-300"}>{activity.pace}</span></td>
                          <td className="py-3 text-slate-300">{activity.heartRate == null ? "—" : `${activity.heartRate} bpm`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {guardrailEvents.length > 0 ? (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">Recent pace guardrail alerts</div>
                  <div className="space-y-2">
                    {guardrailEvents.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs leading-5 text-amber-100/90">
                        {item.date}: {item.distance.toFixed(1)} km at {item.pace} min/km (limit {item.limit}); recovery reserved for {item.recoveryDate}.
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Panel>
          </section>

          <Panel title="Cadangan data lokal" subtitle="Export or restore this browser's training records and profile. Imports replace the current local records.">
            <div className="flex flex-wrap items-end gap-4">
              <button type="button" className={secondaryButtonClass} onClick={exportLocalBackup}>Export backup JSON</button>
              <Field label="Import backup JSON" hint="Only validated AI Running Coach backup files, schema version 1, are accepted.">
                <input className={inputClass} type="file" accept=".json,application/json" onChange={importLocalBackup} />
              </Field>
            </div>
            {backupMessage ? <p role="status" className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-300">{backupMessage}</p> : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">Backups contain activity records, hip check-ins, recovery dates, pace alerts, and your profile. Strava session cookies are not exportable. Keep backup files private; they may contain personal training information.</p>
          </Panel>

          <Panel
            title="Kalender latihan bulanan"
            subtitle="Sesi harian berasal dari rencana. Pilih tanggal untuk melihat detail; check-in dan kunci pemulihan menggantikan sesi terjadwal."
            action={(
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  aria-label="Bulan sebelumnya"
                  onClick={() => {
                    const month = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                    setCalendarMonth(month);
                    setSelectedCalendarDate(toLocalISODate(month));
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  aria-label="Bulan berikutnya"
                  onClick={() => {
                    const month = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                    setCalendarMonth(month);
                    setSelectedCalendarDate(toLocalISODate(month));
                  }}
                >
                  Next
                </button>
              </div>
            )}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">{calendarMonthLabel}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                {[
                  ["Easy", "Easy"],
                  ["Quality", "Quality"],
                  ["Long easy", "Long easy"],
                  ["Strength", "Strength"],
                  ["Recovery", "Recovery"],
                  ["Rest", "Rest"],
                ].map(([type, label]) => (
                  <span key={type} className={`rounded-lg border px-2 py-1 ${calendarTypeTone[type]}`}>{label}</span>
                ))}
              </div>
            </div>
            <div className="-mx-2 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0 md:overflow-visible md:pb-0">
              <div className="grid min-w-[490px] grid-cols-7 gap-1.5 sm:gap-2 md:min-w-0">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <div key={day} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                  </div>
                ))}
                {calendarCells.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="min-h-20 rounded-lg sm:min-h-24" aria-hidden="true" />;
                  const dateIso = toLocalISODate(date);
                  const entry = getCalendarWorkoutForDate(date, checkIns, recoveryDates, marathonGoalPace);
                  const selected = dateIso === selectedCalendarDate;
                  return (
                    <button
                      key={dateIso}
                      type="button"
                      aria-label={`${formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}: ${entry ? entry.workout.title : "outside plan period"}`}
                      aria-pressed={selected}
                      onClick={() => setSelectedCalendarDate(dateIso)}
                      className={`min-h-20 rounded-lg border p-1.5 text-left transition hover:border-slate-500 sm:min-h-24 sm:p-2 ${selected ? "border-emerald-400 ring-1 ring-emerald-400/40" : "border-slate-800"} ${entry ? calendarTypeTone[entry.workout.type] || calendarTypeTone.Rest : "bg-slate-950/40 text-slate-600"}`}
                    >
                      <span className={`block text-xs font-semibold ${selected ? "text-white" : ""}`}>{date.getDate()}</span>
                      <span className="mt-1 block truncate text-[10px] leading-4 sm:text-xs">
                        {entry ? entry.workout.locked ? "Recovery lock" : entry.workout.title : "Outside plan"}
                      </span>
                      {entry && entry.workout.distance > 0 ? <span className="mt-0.5 block text-[10px] opacity-70">{entry.workout.distance.toFixed(1)} km</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4" aria-live="polite">
              {selectedCalendarEntry ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">
                        {formatDate(selectedCalendarDateObject, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · Week {selectedCalendarEntry.week} · {selectedCalendarEntry.weekRow.phase}
                      </div>
                      <h4 className="mt-1 text-lg font-semibold text-white">{selectedCalendarEntry.workout.title}</h4>
                    </div>
                    <Badge tone={selectedCalendarEntry.workout.locked ? "amber" : "slate"}>{selectedCalendarEntry.workout.type.toUpperCase()}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{selectedCalendarEntry.workout.note}</p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                    <span>Session: <strong className="text-slate-200">{selectedCalendarEntry.workout.distance.toFixed(1)} km</strong></span>
                    {selectedCalendarEntry.workout.distance > 0 && selectedCalendarEntry.workout.type !== "Quality"
                      ? <span>Easy-pace duration guide: {formatDuration(selectedCalendarEntry.workout.distance * EASY_PACE_MIN)}–{formatDuration(selectedCalendarEntry.workout.distance * EASY_PACE_MAX)}</span>
                      : selectedCalendarEntry.workout.type === "Quality"
                        ? <span>Total duration varies with the optional quality segment.</span>
                        : null}
                    <span>Weekly cap: {round1(selectedCalendarEntry.weekRow.targetVolume * (selectedCalendarEntry.hipLock ? 0.75 : 1)).toFixed(1)} km{selectedCalendarEntry.hipLock ? " (75% hip-status cap)" : ""}</span>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-semibold text-white">
                    {formatDate(selectedCalendarDateObject, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                  </h4>
                  <p className="mt-2 text-sm text-slate-400">This date is outside the plan period; no workout is prescribed.</p>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Rencana 157 minggu menuju marathon" subtitle="Template tetap dari 09 November 2026 sampai 04 November 2029 (contoh tanggal lomba; sesuaikan dengan lomba pilihan Anda). Minggu 1-12 mengikuti jadwal rinci, minggu ke-4 tiap siklus adalah pemulihan, dan blok maraton 18 minggu dimulai 02 Juli 2029. Pace dan tanggal diperbarui setelah tes 5K (akhir Jan 2027).">
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_260px]">
              <Field label="Cari rencana">
                <input className={inputClass} type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              </Field>
              <Field label="Filter fase">
                <select className={inputClass} value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
                  <option value="all">All phases</option>
                  {PHASES.map((phase) => <option key={phase.id} value={phase.name}>{phase.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Showing {filteredPlan.length} of {TOTAL_WEEKS} weeks</span>
              <span>Easy pace: {formatPace(EASY_PACE_MIN)}–{formatPace(EASY_PACE_MAX)} min/km · separate from race goal pace</span>
            </div>
            <div className="max-h-[620px] overflow-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-800 text-xs uppercase tracking-wider text-slate-300">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Week</th>
                    <th className="px-3 py-3 font-semibold">Dates</th>
                    <th className="px-3 py-3 font-semibold">Phase</th>
                    <th className="px-3 py-3 font-semibold">Target volume</th>
                    <th className="px-3 py-3 font-semibold">Easy pace</th>
                    <th className="px-3 py-3 font-semibold">Optional quality pace</th>
                    <th className="px-3 py-3 font-semibold">Quality workout note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {filteredPlan.map((row) => {
                    const isActive = row.week === activeWeek;
                    const volume = isActive ? activeVolume : row.targetVolume;
                    return (
                      <tr key={row.week} className={isActive ? "bg-emerald-950/30" : "hover:bg-slate-800/40"}>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-100">{row.week}{isActive ? <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Current</span> : null}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-400">{formatDateRange(row.start, row.end)}</td>
                        <td className="px-3 py-3 text-slate-300">{row.phase}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-200">{volume.toFixed(1)} km{isActive && activeHipLock ? <span className="ml-2 text-xs text-amber-300">−25%</span> : null}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-emerald-300">{formatPace(row.easyPaceMin)}–{formatPace(row.easyPaceMax)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sky-300">{suggestedQualityPaceForWeek(row.week, marathonGoalPace) === null ? "—" : `${formatPace(suggestedQualityPaceForWeek(row.week, marathonGoalPace))} min/km`}</td>
                        <td className="max-w-xl px-3 py-3 leading-6 text-slate-400">{qualityNoteForWeek(row.week, phaseForWeek(row.week), marathonGoalPace)}</td>
                      </tr>
                    );
                  })}
                  {filteredPlan.length === 0 ? <tr><td colSpan="7" className="px-4 py-10 text-center text-sm text-slate-500">No weeks match the current search and phase filter.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PHASES.slice(0, 7).map((phase) => (
                <div key={phase.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-200">{phase.name}</span><span className="text-xs text-slate-500">Weeks {phase.start}–{phase.end}</span></div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{phase.focus}</p>
                </div>
              ))}
            </div>
          </Panel>

          <footer className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-6 text-slate-500">
            <div className="font-semibold text-slate-300">Coaching and safety notes</div>
            Ini alat perencanaan dan pencatatan, bukan alat medis atau pengganti penilaian dokter. Aturan pelatih bersifat deterministik, bukan saran AI. Berhenti dan periksakan diri bila ada nyeri dada, sesak tidak wajar, pusing berat, pingsan, nyeri tajam yang bertahan, atau bengkak. Tekanan darah dan kesehatan umum perlu dikonsultasikan berkala dengan dokter. Data tersimpan di browser ini kecuali Anda menghubungkan Strava.
          </footer>
        </main>
      </div>
    </div>
  );
}
