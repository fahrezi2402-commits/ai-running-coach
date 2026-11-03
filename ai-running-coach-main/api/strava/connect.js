import {
  createOAuthState,
  getStravaConfig,
  requireSameOrigin,
  sendJson,
  setNoStore,
  setOAuthStateCookie,
  StravaError,
} from "../../lib/strava.js";

export default function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    requireSameOrigin(req);
    const { clientId, redirectUri } = getStravaConfig();
    const state = createOAuthState();
    const authorizationUrl = new URL("https://www.strava.com/oauth/authorize");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      approval_prompt: "auto",
      scope: "read,activity:read_all",
      state,
    }).toString();
    setOAuthStateCookie(res, state);
    return sendJson(res, 200, { authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    const statusCode = error instanceof StravaError ? error.statusCode : 500;
    const message = error instanceof StravaError
      ? error.message
      : "Unable to start Strava authorization.";
    return sendJson(res, statusCode, { error: message });
  }
}
