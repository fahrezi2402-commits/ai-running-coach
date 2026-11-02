import {
  clearStateCookie,
  exchangeAuthorizationCode,
  getStravaConfig,
  matchesOAuthState,
  readCookie,
  setNoStore,
  setSessionCookie,
} from "../../lib/strava.js";

function redirect(res, destination) {
  res.statusCode = 302;
  res.setHeader("Location", destination);
  res.end();
}

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    return res.end("Method not allowed.");
  }

  let destination;
  try {
    destination = new URL("/", getStravaConfig().appUrl);
  } catch {
    res.statusCode = 500;
    return res.end("Strava server configuration is incomplete.");
  }
  const state = typeof req.query?.state === "string" ? req.query.state : "";
  const expectedState = readCookie(req, "strava_oauth_state");
  clearStateCookie(res);
  if (!matchesOAuthState(expectedState, state)) {
    res.statusCode = 400;
    return res.end("Strava authorization could not be verified. Start the connection again.");
  }

  const authorizationError = typeof req.query?.error === "string" ? req.query.error : "";
  if (authorizationError) {
    destination.searchParams.set("strava", "denied");
    return redirect(res, destination.toString());
  }

  const code = typeof req.query?.code === "string" ? req.query.code : "";
  if (!code) {
    res.statusCode = 400;
    return res.end("Strava authorization could not be verified. Start the connection again.");
  }

  try {
    const session = await exchangeAuthorizationCode(code);
    setSessionCookie(res, session);
    destination.searchParams.set("strava", "connected");
    return redirect(res, destination.toString());
  } catch {
    destination.searchParams.set("strava", "failed");
    return redirect(res, destination.toString());
  }
}
