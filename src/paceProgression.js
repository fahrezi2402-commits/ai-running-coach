export const DEFAULT_MARATHON_GOAL_PACE = 7.5;
export const FIRST_QUALITY_PACE_WEEK = 53;
export const LAST_QUALITY_PACE_WEEK = 149;
export const QUALITY_PACE_BLOCK_WEEKS = 4;
const INITIAL_QUALITY_PACE = 9.5;

export function parsePaceInput(value) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(String(value).trim());
  if (!match) return null;

  const pace = Number(match[1]) + Number(match[2]) / 60;
  return pace >= 5 && pace <= 15 ? pace : null;
}

export function suggestedQualityPaceForWeek(week, goalPace = DEFAULT_MARATHON_GOAL_PACE) {
  if (!Number.isInteger(week)
    || week < FIRST_QUALITY_PACE_WEEK
    || week > LAST_QUALITY_PACE_WEEK
    || week % QUALITY_PACE_BLOCK_WEEKS === 0
    || !Number.isFinite(goalPace)
    || goalPace < 5
    || goalPace > 15) {
    return null;
  }

  const blockCount = Math.ceil((LAST_QUALITY_PACE_WEEK - FIRST_QUALITY_PACE_WEEK) / QUALITY_PACE_BLOCK_WEEKS);
  const blockIndex = Math.floor((week - FIRST_QUALITY_PACE_WEEK) / QUALITY_PACE_BLOCK_WEEKS);
  const startingPace = Math.max(INITIAL_QUALITY_PACE, goalPace);
  return startingPace + ((goalPace - startingPace) * blockIndex) / blockCount;
}

export function marathonTimeAtPace(paceMinutesPerKm) {
  const totalSeconds = Math.round(paceMinutesPerKm * 42.195 * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}
