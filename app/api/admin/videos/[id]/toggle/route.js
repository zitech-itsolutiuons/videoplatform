import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../../../lib/db';
import Video from '../../../../../../models/Video';
import { requireAdminUser } from '../../../../../../lib/requireAdmin';
// app/api/admin/videos/[id]/toggle/route.js

// Never statically prerendered — this route depends on live auth/DB state.
export const dynamic = "force-dynamic";

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