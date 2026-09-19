// app/api/stream/[videoId]/[segment]/route.js
// -----------------------------------------------------------------------------
// GET /api/stream/:videoId/:segment?token=<streamJWT>
//
// The ONLY thing the browser ever talks to for video data. It never sees the
// R2 bucket or gets a bucket URL. On every single request (the playlist AND
// every .ts chunk) we:
//   1. verify the short-lived stream JWT
//   2. re-check Video.is_active / is_public / allowed_users and User.isActive
//      LIVE from Mongo
// Step 2 is what makes admin revocation take effect immediately instead of
// waiting up to 5 minutes for the JWT to expire.
//
// Segments are buffered in memory rather than true-streamed — HLS chunks
// from a 6s segment duration are small (typically well under a few MB), so
// this stays comfortably inside serverless memory/time limits and avoids the
// complexity of bridging a Node Readable into a Web ReadableStream.
// -----------------------------------------------------------------------------
import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '../../../../../lib/r2Client';
import { verifyStreamToken } from '../../../../../lib/auth';
import { dbConnect } from '../../../../../lib/db';
import Video from '../../../../../models/Video';
import User from '../../../../../models/User';

// Must run on the Node.js runtime (not Edge) — aws-sdk and Mongoose both
// depend on Node APIs the Edge runtime doesn't provide.
export const runtime = 'nodejs';
// Give segment fetches more headroom than Vercel's default in case of a slow
// R2 response. Ignored on plans/runtimes that don't support it.
export const maxDuration = 30;
// Never statically prerendered — depends on live auth/DB state per request.
export const dynamic = 'force-dynamic';

async function checkLivePermissions(payload, videoId) {
  const video = await Video.findById(videoId);
  if (!video || !video.is_active) return { ok: false, reason: 'Video deactivated' };

  if (payload.pub) {
    if (!video.is_public) return { ok: false, reason: 'Public sharing was turned off' };
    return { ok: true, video };
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) return { ok: false, reason: 'User revoked' };

  const allowed = user.role === 'Admin' || video.allowed_users.some((id) => id.equals(user._id));
  if (!allowed) return { ok: false, reason: 'User removed from allowed list' };

  return { ok: true, video };
}

export async function GET(req, { params }) {
  return handleStreamRequest(req, params);
}

// Some browsers/network conditions issue this as a POST rather than GET for
// media sub-resource requests. The logic is identical either way — nothing
// here depends on a request body, only the token query param and URL params
// — so accept both rather than 405 legitimate playback requests.
export async function POST(req, { params }) {
  return handleStreamRequest(req, params);
}

async function handleStreamRequest(req, params) {
  await dbConnect();
  const { videoId, segment } = params;
  const token = req.nextUrl.searchParams.get('token');

  // --- 1. Token validity -----------------------------------------------------
  let payload;
  try {
    payload = verifyStreamToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired stream token' }, { status: 401 });
  }
  if (payload.vid !== videoId) {
    return NextResponse.json({ error: 'Token not valid for this video' }, { status: 403 });
  }

  // --- 2. Live DB permission re-check (the actual revocation mechanism) -----
  const check = await checkLivePermissions(payload, videoId);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }
  const { video } = check;

  // Basic path safety: only allow expected HLS filenames.
  if (!/^[\w.-]+\.(m3u8|ts)$/.test(segment)) {
    return NextResponse.json({ error: 'Invalid segment name' }, { status: 400 });
  }

  const key = `${video.hls_folder_path.replace(/\/+$/, '')}/${segment}`;

  try {
    const obj = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));

    if (segment.endsWith('.m3u8')) {
      // AWS SDK v3's response Body has a convenience helper to read the whole
      // thing as a string in Node environments.
      const text = await obj.Body.transformToString();

      // Rewrite the playlist so every referenced .ts points back through THIS
      // route with the SAME token — the client never learns real R2 keys.
      const rewritten = text
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            return `/api/stream/${videoId}/${trimmed}?token=${token}`;
          }
          return line;
        })
        .join('\n');

      return new NextResponse(rewritten, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store', // never let CDNs/browsers cache the playlist
        },
      });
    }

    // .ts binary segment.
    const bytes = await obj.Body.transformToByteArray();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'video/MP2T',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('R2 fetch error:', err.message);
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  }
}