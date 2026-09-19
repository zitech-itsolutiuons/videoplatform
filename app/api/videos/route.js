import { NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/db';
import Video from '../../../models/Video';
import { getAuthUser } from '../../../lib/auth';
// app/api/videos/route.js
// GET /api/videos — Admins see every video (active or not, so they can
// re-activate). Viewers only see videos that are active AND include them in
// allowed_users.

// Never statically prerendered — this route depends on live auth/DB state.
export const dynamic = "force-dynamic";

export async function GET(req) {
  await dbConnect();
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = user.role === 'Admin';
  const query = isAdmin ? {} : { is_active: true, allowed_users: user._id };

  // Admins additionally need is_public/public_share_secret to render sharing
  // controls; Viewers never see those fields, and neither role ever sees
  // hls_folder_path.
  const fields = isAdmin
    ? 'title description is_active is_public public_share_secret createdAt'
    : 'title description is_active createdAt';

  const videos = await Video.find(query).select(fields).sort({ createdAt: -1 });
  return NextResponse.json(videos);
}