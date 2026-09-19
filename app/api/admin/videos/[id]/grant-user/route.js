// app/api/admin/videos/[id]/grant-user/route.js
import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../../../lib/db';
import Video from '../../../../../../models/Video';
import { requireAdminUser } from '../../../../../../lib/requireAdmin';

export async function PATCH(req, { params }) {
  await dbConnect();
  const { error } = await requireAdminUser(req);
  if (error) return error;

  const { userId } = await req.json();
  const video = await Video.findByIdAndUpdate(
    params.id,
    { $addToSet: { allowed_users: userId } },
    { new: true }
  );
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  return NextResponse.json({ id: video._id, allowed_users: video.allowed_users });
}
