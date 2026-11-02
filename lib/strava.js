import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const SESSION_COOKIE = "strava_session";
const STATE_COOKIE = "strava_oauth_state";
const SESSION_COOKIE_PATH = "/api/strava";
const STATE_COOKIE_PATH = "/api/strava/callback";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const STATE_MAX_AGE = 10 * 60;

export class StravaError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "StravaError";
    this.statusCode = statusCode;
  }
}

export function isStravaConfigured() {
  try {
    getStravaConfig();
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

function getAppUrl() {
  const configuredUrl = process.env.APP_URL;
  if (!configuredUrl) throw new StravaError("Strava server configuration is incomplete.");

  let url;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new StravaError("Strava server configuration is invalid.");
  }

  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(localHost && url.protocol === "http:"))
      || url.pathname !== "/"
      || url.search
      || url.hash
  ) {
    throw new StravaError("APP_URL must be an HTTPS origin without a path.");
  }
  return url;
}

export function getStravaConfig() {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    throw new StravaError("Strava server configuration is incomplete.");
  }
  const appUrl = getAppUrl();
  return {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    appUrl,
    redirectUri: new URL("/api/strava/callback", appUrl).toString(),
  };
}

function getEncryptionKey() {
  const configuredKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!configuredKey) throw new StravaError("Strava server configuration is incomplete.");

  const key = Buffer.from(configuredKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== configuredKey) {
    throw new StravaError("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptSession(session) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSession(value) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new StravaError("Strava session is invalid.", 401);

  try {
    const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"));
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
      throw new Error("Invalid encrypted session.");
    }
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const session = JSON.parse(Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8"));
    if (
      typeof session.accessToken !== "string"
        || typeof session.refreshToken !== "string"
        || !Number.isFinite(session.expiresAt)
        || !session.athlete
    ) {
      throw new Error("Invalid session payload.");
    }
    return session;
  } catch {
    throw new StravaError("Strava session is invalid or expired. Reconnect your account.", 401);
  }
}

function cookieSecureAttribute() {
  if (process.env.APP_URL) {
    try {
      return new URL(process.env.APP_URL).protocol === "https:";
    } catch {
      return process.env.NODE_ENV === "production";
    }
  }
  return process.env.NODE_ENV === "production";
}

export function buildCookie(name, value, { path, maxAge }) {
  const attributes = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (cookieSecureAttribute()) attributes.push("Secure");
  return attributes.join("; ");
}

export function appendCookie(res, cookie) {
  const existing = res.getHeader("Set-Cookie");
  const cookies = existing
    ? Array.isArray(existing) ? existing : [existing]
    : [];
  res.setHeader("Set-Cookie", [...cookies, cookie]);
}

export function setSessionCookie(res, session) {
  const encrypted = encryptSession(session);
  appendCookie(res, buildCookie(SESSION_COOKIE, encrypted, {
    path: SESSION_COOKIE_PATH,
    maxAge: SESSION_MAX_AGE,
  }));
}

export function clearSessionCookie(res) {
  appendCookie(res, buildCookie(SESSION_COOKIE, "", {
    path: SESSION_COOKIE_PATH,
    maxAge: 0,
  }));
}

export function clearStateCookie(res) {
  appendCookie(res, buildCookie(STATE_COOKIE, "", {
    path: STATE_COOKIE_PATH,
    maxAge: 0,
  }));
}

export function readCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator).trim() !== name) continue;
    return entry.slice(separator + 1).trim();
  }
  return null;
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function matchesOAuthState(expected, actual) {
  if (!expected || !actual) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export function requireSameOrigin(req) {
  const origin = req.headers.origin;
  const expectedOrigin = getAppUrl().origin;
  if (origin !== expectedOrigin) {
    throw new StravaError("This request did not come from the configured application.", 403);
  }
}

export function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function getSessionFromRequest(req) {
  const value = readCookie(req, SESSION_COOKIE);
  return value ? decryptSession(value) : null;
}

async function requestToken(parameters) {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(parameters),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (
    !response.ok
      || typeof payload?.access_token !== "string"
      || typeof payload?.refresh_token !== "string"
      || !Number.isFinite(payload?.expires_at)
  ) {
    const statusCode = response.status === 400 || response.status === 401 ? 401 : 502;
    throw new StravaError("Strava could not complete authentication. Please try again.", statusCode);
  }
  return payload;
}

export async function exchangeAuthorizationCode(code) {
  const { clientId, clientSecret } = getStravaConfig();
  const payload = await requestToken({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_at,
    connectedAt: new Date().toISOString(),
    athlete: {
      id: payload.athlete?.id ?? null,
      firstName: typeof payload.athlete?.firstname === "string" ? payload.athlete.firstname : "",
      lastName: typeof payload.athlete?.lastname === "string" ? payload.athlete.lastname : "",
    },
  };
}

export async function refreshSessionIfNeeded(session, res, force = false) {
  if (!force && session.expiresAt > Math.floor(Date.now() / 1000) + 60) return session;

  const { clientId, clientSecret } = getStravaConfig();
  const payload = await requestToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });
  const refreshedSession = {
    ...session,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_at,
  };
  setSessionCookie(res, refreshedSession);
  return refreshedSession;
}

export async function revokeStravaGrant(accessToken) {
  const { clientId, clientSecret } = getStravaConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://www.strava.com/oauth/revoke", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: accessToken,
      token_type_hint: "access_token",
    }),
  });
  if (!response.ok) {
    throw new StravaError("Strava could not revoke authorization. Your connection is still active; try again.", 502);
  }
}

export function setOAuthStateCookie(res, state) {
  appendCookie(res, buildCookie(STATE_COOKIE, state, {
    path: STATE_COOKIE_PATH,
    maxAge: STATE_MAX_AGE,
  }));
}
