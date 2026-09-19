// app/api/admin/videos/[id]/toggle/route.js
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

  video.is_active = !video.is_active;
  await video.save();

  return NextResponse.json({ id: video._id, is_active: video.is_active });
}
