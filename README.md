# AI Running Coach

A local-first React app for a 157-week marathon plan, manual activity logging, pace guardrails, and weekly hip check-ins. Manual records and imported Strava run summaries are stored in the browser's LocalStorage. Strava OAuth and token handling run in same-origin Vercel Functions.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
npx vercel link
npx vercel env pull .env.local
npx vercel dev
```

Before starting Vercel Dev, make sure `.env.local` contains the values from `.env.example` and override `APP_URL` to `http://localhost:3000`. Strava allows `localhost` and `127.0.0.1` callback domains for local OAuth. The local callback URL is `http://localhost:3000/api/strava/callback`.

For a static frontend-only preview, `npm run dev` runs Vite, but the Strava API routes are not available through the Vite server.

## Configure Strava and Vercel

1. Import this GitHub repository into Vercel and deploy it as a Vite project. Keep the project root at the repository root, set the build command to `npm run build` and output directory to `dist`; Vercel serves the functions in `api/` alongside the built frontend.
2. In the Vercel project **Settings → Environment Variables**, set the following for the Production environment (and Preview only if you deliberately configure a matching callback domain):

   | Variable | Value |
   | --- | --- |
   | `STRAVA_CLIENT_ID` | Client ID from your Strava API application |
   | `STRAVA_CLIENT_SECRET` | Client Secret from your Strava API application; server-side only |
   | `APP_URL` | Exact public origin, e.g. `https://your-project.vercel.app` (no path or trailing slash) |
   | `TOKEN_ENCRYPTION_KEY` | Base64-encoded random 32-byte key; generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` |

   Never add the Strava Client Secret or encryption key to frontend variables (`VITE_*`), source code, or a committed `.env` file. Changing the encryption key invalidates existing browser sessions; users must connect again.
3. In the Strava API application settings, set **Authorization Callback Domain** to the hostname only, such as `your-project.vercel.app` (no scheme, path, or trailing slash). The exact redirect URL used by the app is `https://your-project.vercel.app/api/strava/callback`. If using a custom domain, use that hostname and set `APP_URL` to its HTTPS origin.
4. Save the environment variables and redeploy the Vercel project. Open the production URL, select **Connect with Strava**, and approve the requested read scopes. Use **Import recent runs** to load up to the 30 most recent run, trail-run, or virtual-run activities.

Vercel Functions are required for live Strava access. The GitHub Pages workflow is retained for static previews and builds with the `/ai-running-coach/` base path, but GitHub Pages cannot run the OAuth API routes; use the Vercel URL for a real connection.

## Security and storage notes

The OAuth state is random, short-lived, and checked on callback. The Strava authorization-code exchange and token refresh happen on the server. Access and refresh tokens are encrypted with AES-256-GCM in a Secure (on HTTPS), HttpOnly, SameSite=Lax cookie; tokens are never returned to browser JavaScript or stored in LocalStorage. Disconnect revokes the Strava grant through Strava's OAuth revoke endpoint and clears the cookie. The cookie is a self-contained session with no database: clearing site cookies or changing the encryption key requires reconnecting, and sessions cannot be centrally revoked from another browser.

Imported activity summaries are saved locally in the browser and are not synchronized between devices. Only run, trail-run, and virtual-run activities are imported. Importing a run dated today applies the existing easy-pace recovery guardrail; older runs are history only. The training plan and hip-status checks are planning aids, not medical advice or an individualized prescription.

## Build and static preview

```sh
npm run build
npm run preview
```
