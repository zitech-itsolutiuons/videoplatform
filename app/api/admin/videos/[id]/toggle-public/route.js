// app/api/admin/videos/[id]/toggle-public/route.js
// Turning this ON auto-generates a share secret if one doesn't exist yet.
// Turning it OFF instantly kills the public link (checked live in stream route).
import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../../../lib/db';
import Video from '../../../../../../models/Video';
import { requireAdminUser } from '../../../../../../lib/requireAdmin';

export async function PATCH(req, { params }) {
  await dbConnect();
  const { error } = await requireAdminUser(req);
  if (error) return error;

  const video = await Video.findById(params.id);
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  video.is_public = !video.is_public;
  if (video.is_public && !video.public_share_secret) {
    video.regeneratePublicShareSecret();
  }
  await video.save();

  return NextResponse.json({
    id: video._id,
    is_public: video.is_public,
    share_secret: video.is_public ? video.public_share_secret : null,
  });
}
