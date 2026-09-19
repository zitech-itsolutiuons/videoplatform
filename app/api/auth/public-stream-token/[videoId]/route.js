// app/api/auth/public-stream-token/[videoId]/route.js
// -----------------------------------------------------------------------------
// Deliberately does NOT call getAuthUser — this is the no-login entry point.
// Anyone who has the videoId AND the current share secret gets a token.
// Regenerating/clearing the secret, or flipping is_public off, immediately
// kills every link that was ever shared using the old secret.
// -----------------------------------------------------------------------------
import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../../lib/db';
import Video from '../../../../../models/Video';
import { issuePublicStreamToken } from '../../../../../lib/auth';

export async function POST(req, { params }) {
  await dbConnect();
  const share = req.nextUrl.searchParams.get('share');

  const video = await Video.findById(params.videoId);
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  if (!video.is_active) {
    return NextResponse.json({ error: 'This video is currently unavailable' }, { status: 403 });
  }
  if (!video.is_public) {
    return NextResponse.json({ error: 'This video is not publicly shared' }, { status: 403 });
  }
  if (!video.public_share_secret || video.public_share_secret !== share) {
    return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 403 });
  }

  const streamToken = issuePublicStreamToken(video._id);
  return NextResponse.json({ streamToken, expiresIn: 300 });
}
