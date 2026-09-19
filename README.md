# Secure HLS Video Platform — Vercel edition

One Next.js project (App Router) with everything — pages AND API routes — so
the whole thing deploys to Vercel as a single project. MongoDB (Mongoose) is
the database, Cloudflare R2 is the storage, and the access-control logic is
identical to the standalone-Express version: short-lived stream tokens plus a
LIVE permission re-check on every single segment request, so admin
revocation takes effect immediately instead of waiting for a token to expire.

## What changed vs. the Express version

- No separate backend server — `app/api/**/route.js` files replace
  `routes/*.js` + `server.js`.
- No CORS setup needed and no `NEXT_PUBLIC_API_BASE_URL` — frontend and API
  are the same origin, so every fetch call is just a relative `/api/...` path.
- `lib/db.js` caches the Mongoose connection on `global` so serverless
  function warm-starts reuse it instead of reconnecting every request.
- FFmpeg conversion (`scripts/convertAndUpload.js`) still has to run
  **locally**, never on Vercel — serverless functions don't have FFmpeg
  installed and aren't built for long CPU-bound encoding jobs. It connects to
  the same Atlas cluster and R2 bucket your deployed app uses.

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # fill in Mongo URI, JWT secrets, R2 credentials
```

FFmpeg must be installed locally to run the upload script:
- macOS: `brew install ffmpeg`
- Windows: `winget install Gyan.FFmpeg` (then open a NEW terminal)
- Ubuntu: `sudo apt install ffmpeg`

Run the app locally:
```bash
npm run dev
```

## 2. MongoDB Atlas

1. Create a free cluster at cloud.mongodb.com.
2. Network Access → allow your current IP (or `0.0.0.0/0` for easy local dev
   — tighten this later).
3. Copy the connection string into `MONGO_URI` in `.env.local`.

## 3. Cloudflare R2 (free tier)

1. Create an R2 bucket (10GB free, zero egress fees).
2. Create an R2 API token with **Object Read & Write** permission.
3. `R2_ENDPOINT` is `https://<account_id>.r2.cloudflarestorage.com`.
4. Keep the bucket private — only your app's credentials should read it.

## 4. Create your first Admin user

```bash
npm run create-admin -- "Your Name" you@example.com "yourPassword123"
```

Copy the printed `_id` into `.env.local` as `UPLOAD_ADMIN_USER_ID`.

## 5. Upload a recording

```bash
npm run upload -- "/path/to/recording.mp4" "Q3 Feature Walkthrough"
```

This runs locally: transcodes to HLS, uploads to R2, creates the Mongo
`Video` doc (`is_active: true`, `allowed_users: []` until an admin grants
access).

## 6. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Import it in Vercel (vercel.com → Add New → Project).
3. In Vercel's Project Settings → Environment Variables, add every variable
   from `.env.example` with your real values (`MONGO_URI`,
   `JWT_SESSION_SECRET`, `JWT_STREAM_SECRET`, `R2_ENDPOINT`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`). You do
   NOT need `UPLOAD_ADMIN_USER_ID` on Vercel — that's only used by the local
   upload script.
4. Deploy. Vercel auto-detects Next.js — no extra config needed.
5. Make sure Atlas's Network Access allows connections from anywhere
   (`0.0.0.0/0`), since Vercel's serverless functions run from a changing
   pool of IPs, not one fixed address.

## 7. Using it

- Log in at `/login` with the admin account you created.
- `/videos` lists what you're allowed to watch (Admins see everything).
- `/admin` is the dashboard: toggle a video active/inactive, revoke a
  specific user, or turn on a public share link (see below).
- `/watch/[id]?share=<secret>` is the no-login public link page.

## 8. Public, no-login sharing (optional)

Same behavior as before: an admin flips "Public link enabled" on a video in
`/admin`, which generates a `public_share_secret` and shows a shareable URL.
Anyone with that link watches without an account. Turning it off, or
regenerating the link, kills the old one immediately — checked live on every
segment request, same mechanism as user revocation.

## Vercel-specific notes and limits

- **Function duration**: the segment-proxy route sets
  `export const maxDuration = 30` — Vercel's Hobby plan may cap this lower
  depending on your plan/runtime. If large segments start timing out,
  either shorten `-hls_time` in the upload script (e.g. to 4s, for smaller
  chunks) or upgrade your Vercel plan.
- **Runtime**: all API routes run on the Node.js runtime (not Edge), since
  `mongoose` and `@aws-sdk/client-s3` need Node APIs. This is already set;
  don't add `export const runtime = 'edge'` to these files.
- **Cold starts**: the first request after inactivity will be a bit slower
  while Mongoose reconnects. Subsequent requests reuse the cached connection.
- **FFmpeg**: genuinely cannot run on Vercel. Keep using
  `scripts/convertAndUpload.js` locally as your upload workflow.

## Honest limitation on "can't be downloaded"

No browser-based player can make video **impossible** to capture — screen
recording always exists as a fallback. This architecture removes the casual
download paths (no direct/permanent file URL ever reaches the browser, no
"Save video as," no PiP pop-out, every segment requires a live, scoped,
re-validated token) and gives you fast, reliable revocation. True DRM-grade
protection (Widevine/FairPlay) would need a paid provider like Mux or
Cloudflare Stream.
