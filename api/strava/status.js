import {
  clearSessionCookie,
  getSessionFromRequest,
  isStravaConfigured,
  sendJson,
  setNoStore,
  StravaError,
} from "../../lib/strava.js";

export default function handler(req, res) {
  setNoStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (!isStravaConfigured()) {
    return sendJson(res, 200, { configured: false, connected: false, athlete: null });
  }

  try {
    const session = getSessionFromRequest(req);
    return sendJson(res, 200, {
      configured: true,
      connected: Boolean(session),
      athlete: session ? session.athlete : null,
    });
  } catch (error) {
    clearSessionCookie(res);
    if (error instanceof StravaError && error.statusCode === 401) {
      return sendJson(res, 200, {
        configured: true,
        connected: false,
        athlete: null,
        error: "Your Strava session is invalid or expired. Connect your account again.",
      });
    }
    return sendJson(res, 500, { error: "Unable to check Strava connection status." });
  }
}
