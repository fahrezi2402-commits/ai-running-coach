import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import connectHandler from "../api/strava/connect.js";
import callbackHandler from "../api/strava/callback.js";
import statusHandler from "../api/strava/status.js";
import activitiesHandler from "../api/strava/activities.js";
import disconnectHandler from "../api/strava/disconnect.js";
import {
  buildCookie,
  decryptSession,
  encryptSession,
  matchesOAuthState,
  setSessionCookie,
} from "../lib/strava.js";

const originalEnvironment = {
  APP_URL: process.env.APP_URL,
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
  NODE_ENV: process.env.NODE_ENV,
};
const originalFetch = globalThis.fetch;

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    getHeader(name) {
      return this.headers[name];
    },
    end(body = "") {
      this.body = body;
    },
  };
}

function setCookies(response) {
  const cookies = response.getHeader("Set-Cookie") || [];
  return Array.isArray(cookies) ? cookies : [cookies];
}

function cookiePair(response, name) {
  return setCookies(response).find((cookie) => cookie.startsWith(`${name}=`))?.split(";")[0];
}

function responseJson(response) {
  return JSON.parse(response.body);
}

beforeEach(() => {
  process.env.APP_URL = "https://coach.example";
  process.env.STRAVA_CLIENT_ID = "123456";
  process.env.STRAVA_CLIENT_SECRET = "test-client-secret";
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

after(() => {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("encrypted session cookies protect tokens and use secure HttpOnly attributes", () => {
  const session = {
    accessToken: "access-token-value",
    refreshToken: "refresh-token-value",
    expiresAt: 123,
    athlete: { id: 1, firstName: "Runner", lastName: "One" },
  };
  const encrypted = encryptSession(session);
  assert.equal(decryptSession(encrypted).accessToken, session.accessToken);
  assert.equal(encrypted.includes(session.accessToken), false);
  const [iv, tag, encodedCiphertext] = encrypted.split(".");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");
  ciphertext[0] ^= 1;
  assert.throws(
    () => decryptSession([iv, tag, ciphertext.toString("base64url")].join(".")),
    /invalid or expired/i,
  );

  const cookie = buildCookie("session", encrypted, { path: "/api/strava", maxAge: 60 });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\/api\/strava/);
});

test("OAuth state matching rejects missing and mismatched values", () => {
  assert.equal(matchesOAuthState("random-state", "random-state"), true);
  assert.equal(matchesOAuthState("random-state", "other-state"), false);
  assert.equal(matchesOAuthState("random-state", null), false);
});

test("OAuth initiation enforces same-origin requests and callback rejects mismatched state", async () => {
  const connectResponse = createResponse();
  connectHandler({
    method: "POST",
    headers: { origin: "https://attacker.example" },
  }, connectResponse);
  assert.equal(connectResponse.statusCode, 403);
  assert.deepEqual(responseJson(connectResponse), {
    error: "This request did not come from the configured application.",
  });
  assert.equal(setCookies(connectResponse).length, 0);

  globalThis.fetch = async () => {
    throw new Error("An invalid OAuth state must not exchange a code.");
  };
  const callbackResponse = createResponse();
  await callbackHandler({
    method: "GET",
    query: { code: "untrusted-code", state: "attacker-state" },
    headers: { cookie: "strava_oauth_state=expected-state" },
  }, callbackResponse);
  assert.equal(callbackResponse.statusCode, 400);
  assert.match(setCookies(callbackResponse).join("; "), /strava_oauth_state=; Path=\/api\/strava\/callback; Max-Age=0/);
});

test("OAuth, sanitized run import with refresh, status, and disconnect use server-only tokens", async () => {
  const connectResponse = createResponse();
  connectHandler({
    method: "POST",
    headers: { origin: process.env.APP_URL },
  }, connectResponse);
  assert.equal(connectResponse.statusCode, 200);
  const connectPayload = responseJson(connectResponse);
  const authorizationUrl = new URL(connectPayload.authorizationUrl);
  assert.equal(authorizationUrl.origin, "https://www.strava.com");
  assert.equal(authorizationUrl.searchParams.get("redirect_uri"), `${process.env.APP_URL}/api/strava/callback`);
  const state = authorizationUrl.searchParams.get("state");
  assert.ok(state);
  assert.match(cookiePair(connectResponse, "strava_oauth_state"), /^strava_oauth_state=/);
  assert.match(setCookies(connectResponse).join("; "), /HttpOnly/);

  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://www.strava.com/oauth/token");
    const form = new URLSearchParams(options.body);
    assert.equal(form.get("code"), "temporary-code");
    assert.equal(form.get("client_secret"), process.env.STRAVA_CLIENT_SECRET);
    assert.equal(form.has("redirect_uri"), false);
    return {
      ok: true,
      async json() {
        return {
          access_token: "initial-access-token",
          refresh_token: "initial-refresh-token",
          expires_at: 1,
          athlete: { id: 42, firstname: "Test", lastname: "Runner" },
        };
      },
    };
  };
  const callbackResponse = createResponse();
  await callbackHandler({
    method: "GET",
    query: { code: "temporary-code", state },
    headers: { cookie: cookiePair(connectResponse, "strava_oauth_state") },
  }, callbackResponse);
  assert.equal(callbackResponse.statusCode, 302);
  assert.equal(callbackResponse.headers.Location, `${process.env.APP_URL}/?strava=connected`);
  const sessionCookie = cookiePair(callbackResponse, "strava_session");
  assert.ok(sessionCookie);
  assert.equal(callbackResponse.headers.Location.includes("initial-access-token"), false);

  const statusResponse = createResponse();
  statusHandler({ method: "GET", headers: { cookie: sessionCookie } }, statusResponse);
  assert.deepEqual(responseJson(statusResponse), {
    configured: true,
    connected: true,
    athlete: { id: 42, firstName: "Test", lastName: "Runner" },
  });
  assert.equal(statusResponse.body.includes("initial-access-token"), false);

  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url) === "https://www.strava.com/oauth/token") {
      return {
        ok: true,
        async json() {
          return {
            access_token: "refreshed-access-token",
            refresh_token: "refreshed-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          };
        },
      };
    }
    return {
      ok: true,
      async json() {
        return [
          {
            id: 99,
            name: "Easy run",
            type: "Run",
            distance: 5000,
            moving_time: 1800,
            start_date_local: "2026-10-30T07:00:00Z",
            average_heartrate: 140.4,
          },
          {
            id: 100,
            name: "Ride",
            type: "Ride",
            distance: 20000,
            moving_time: 3600,
            start_date_local: "2026-10-29T07:00:00Z",
            average_heartrate: 120,
          },
          {
            id: 101,
            name: "Trail run",
            type: "TrailRun",
            distance: 8000,
            moving_time: 3600,
            start_date_local: "2026-10-28T07:00:00Z",
          },
        ];
      },
    };
  };
  const activitiesResponse = createResponse();
  await activitiesHandler({ method: "GET", headers: { cookie: sessionCookie } }, activitiesResponse);
  assert.equal(activitiesResponse.statusCode, 200);
  assert.deepEqual(responseJson(activitiesResponse).activities, [
    {
      id: "99",
      name: "Easy run",
      date: "2026-10-30",
      distanceKm: 5,
      durationMinutes: 30,
      heartRate: 140,
    },
    {
      id: "101",
      name: "Trail run",
      date: "2026-10-28",
      distanceKm: 8,
      durationMinutes: 60,
      heartRate: null,
    },
  ]);
  assert.equal(
    new URLSearchParams(requests[0].options.body).get("client_secret"),
    process.env.STRAVA_CLIENT_SECRET,
  );
  assert.equal(requests[1].options.headers.Authorization, "Bearer refreshed-access-token");
  assert.equal(activitiesResponse.body.includes("refreshed-access-token"), false);

  const refreshedCookie = cookiePair(activitiesResponse, "strava_session");
  assert.ok(refreshedCookie);
  const refreshedPayload = decryptSession(refreshedCookie.slice("strava_session=".length));
  assert.equal(refreshedPayload.refreshToken, "refreshed-refresh-token");

  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://www.strava.com/oauth/revoke");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, `Basic ${Buffer.from(`${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`).toString("base64")}`);
    assert.equal(new URLSearchParams(options.body).get("token"), "refreshed-access-token");
    return { ok: true };
  };
  const disconnectResponse = createResponse();
  await disconnectHandler({
    method: "POST",
    headers: { origin: process.env.APP_URL, cookie: refreshedCookie },
  }, disconnectResponse);
  assert.equal(disconnectResponse.statusCode, 200);
  assert.deepEqual(responseJson(disconnectResponse), { connected: false });
  assert.match(
    setCookies(disconnectResponse).find((cookie) => cookie.startsWith("strava_session=")),
    /Max-Age=0/,
  );
});

test("status does not return tokens to the browser", () => {
  const session = {
    accessToken: "must-not-leak-access-token",
    refreshToken: "must-not-leak-refresh-token",
    expiresAt: 123,
    athlete: { id: 1, firstName: "Runner", lastName: "One" },
  };
  const response = createResponse();
  const req = { method: "GET", headers: {} };
  setSessionCookie(response, session);
  req.headers.cookie = cookiePair(response, "strava_session");
  const status = createResponse();
  statusHandler(req, status);
  assert.equal(status.body.includes(session.accessToken), false);
  assert.equal(status.body.includes(session.refreshToken), false);
});
