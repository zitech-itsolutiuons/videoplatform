import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../lib/db';
import Video from '../../../../models/Video';
import { getAuthUser } from '../../../../lib/auth';
// app/api/videos/[id]/route.js

// Never statically prerendered — this route depends on live auth/DB state.
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  await dbConnect();
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const video = await Video.findById(params.id).select('title description is_active allowed_users');
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  const isAllowed = user.role === 'Admin' || video.allowed_users.some((id) => id.equals(user._id));
  if (!isAllowed || !video.is_active) {
    return NextResponse.json({ error: 'You do not have access to this video' }, { status: 403 });
  }

  return NextResponse.json({ id: video._id, title: video.title, description: video.description });
}