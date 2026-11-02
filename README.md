# AI Running Coach

A local-first React single-page app for a 157-week marathon training plan, activity logging, pace guardrails, and weekly hip check-ins. Activity, check-in, and demo connection data are stored in the browser's LocalStorage.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
npm run dev
```

To create and preview a production build:

```sh
npm run build
npm run preview
```

## Deploy to GitHub Pages

Pushing to `main` builds the Vite app and deploys `dist` to GitHub Pages. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**. The Vite base path is configured for `https://<owner>.github.io/ai-running-coach/`.

## Scope and safety

The Strava section only previews an authorization URL and simulates a callback; it does not connect to Strava, exchange tokens, or import activities. Real OAuth requires a trusted backend and secure token storage. The training plan and hip-status checks are planning aids, not medical advice or an individualized prescription.
