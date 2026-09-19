// app/api/admin/videos/[id]/regenerate-share-link/route.js
// Invalidates any previously shared link and issues a brand new secret,
// without needing to toggle is_public off and back on.
import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../../../lib/db';
import Video from '../../../../../../models/Video';
import { requireAdminUser } from '../../../../../../lib/requireAdmin';

export async function POST(req, { params }) {
  await dbConnect();
  const { error } = await requireAdminUser(req);
  if (error) return error;

  const video = await Video.findById(params.id);
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  const secret = video.regeneratePublicShareSecret();
  await video.save();

  return NextResponse.json({ id: video._id, share_secret: secret });
}
