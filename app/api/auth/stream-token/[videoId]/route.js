import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../../lib/db';
import Video from '../../../../../models/Video';
import { getAuthUser, issueStreamToken } from '../../../../../lib/auth';
// app/api/auth/stream-token/[videoId]/route.js
// -----------------------------------------------------------------------------
// Called by the player right before (and periodically during) playback. Does
// the FULL permission check once to mint a short-lived token; the per-segment
// route re-checks the cheap fields again on every chunk so a mid-playback
// revocation still bites immediately.
// -----------------------------------------------------------------------------

// Never statically prerendered — this route depends on live auth/DB state.
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  await dbConnect();
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const video = await Video.findById(params.videoId);
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  if (!video.is_active) {
    return NextResponse.json({ error: 'This video is currently unavailable' }, { status: 403 });
  }

  const isAllowed = user.role === 'Admin' || video.allowed_users.some((id) => id.equals(user._id));
  if (!isAllowed) {
    return NextResponse.json({ error: 'You do not have access to this video' }, { status: 403 });
  }

  const streamToken = issueStreamToken(user._id, video._id);
  return NextResponse.json({ streamToken, expiresIn: 300 });
}