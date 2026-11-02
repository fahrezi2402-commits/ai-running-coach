import {
  clearSessionCookie,
  getSessionFromRequest,
  refreshSessionIfNeeded,
  sendJson,
  setNoStore,
  StravaError,
} from "../../lib/strava.js";

async function fetchActivities(accessToken) {
  const runs = [];
  const pageSize = 100;
  for (let page = 1; page <= 5 && runs.length < 30; page += 1) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.search = new URLSearchParams({ per_page: String(pageSize), page: String(page) }).toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok || !Array.isArray(payload)) {
      const statusCode = response.status === 401 ? 401 : response.status === 429 ? 429 : 502;
      throw new StravaError("Strava could not return activities. Please try again.", statusCode);
    }
    runs.push(...payload
      .filter((activity) => (
      ["Run", "TrailRun", "VirtualRun"].includes(activity.type)
        && Number.isFinite(activity.distance)
        && activity.distance > 0
        && Number.isFinite(activity.moving_time)
        && activity.moving_time > 0
        && typeof activity.start_date_local === "string"
      ))
      .map((activity) => ({
        id: String(activity.id),
        name: typeof activity.name === "string" ? activity.name.slice(0, 120) : "Strava run",
        date: activity.start_date_local.slice(0, 10),
        distanceKm: activity.distance / 1000,
        durationMinutes: activity.moving_time / 60,
        heartRate: Number.isFinite(activity.average_heartrate)
          ? Math.round(activity.average_heartrate)
          : null,
      })));
    if (payload.length < pageSize) break;
  }
  return runs.slice(0, 30);
}

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  let session;
  try {
    session = getSessionFromRequest(req);
    if (!session) return sendJson(res, 401, { error: "Connect Strava before importing activities." });
    session = await refreshSessionIfNeeded(session, res);
    let activities;
    try {
      activities = await fetchActivities(session.accessToken);
    } catch (error) {
      if (!(error instanceof StravaError) || error.statusCode !== 401) throw error;
      session = await refreshSessionIfNeeded(session, res, true);
      activities = await fetchActivities(session.accessToken);
    }
    return sendJson(res, 200, { activities });
  } catch (error) {
    if (error instanceof StravaError && error.statusCode === 401) {
      clearSessionCookie(res);
      return sendJson(res, 401, { error: error.message });
    }
    const statusCode = error instanceof StravaError ? error.statusCode : 500;
    const message = error instanceof StravaError
      ? error.message
      : "Unable to import Strava activities.";
    return sendJson(res, statusCode, { error: message });
  }
}
