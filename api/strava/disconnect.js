import {
  clearSessionCookie,
  getSessionFromRequest,
  refreshSessionIfNeeded,
  revokeStravaGrant,
  requireSameOrigin,
  sendJson,
  setNoStore,
  StravaError,
} from "../../lib/strava.js";

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    requireSameOrigin(req);
    const session = getSessionFromRequest(req);
    if (session) {
      const currentSession = await refreshSessionIfNeeded(session, res);
      await revokeStravaGrant(currentSession.accessToken);
    }
    clearSessionCookie(res);
    return sendJson(res, 200, { connected: false });
  } catch (error) {
    if (error instanceof StravaError && error.statusCode === 401) {
      clearSessionCookie(res);
      return sendJson(res, 200, { connected: false });
    }
    const statusCode = error instanceof StravaError ? error.statusCode : 500;
    const message = error instanceof StravaError
      ? error.message
      : "Unable to disconnect Strava.";
    return sendJson(res, statusCode, { error: message });
  }
}
