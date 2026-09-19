import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../../../lib/db';
import User from '../../../../../../models/User';
import { requireAdminUser } from '../../../../../../lib/requireAdmin';
// app/api/admin/users/[id]/revoke/route.js
// Kills a user account entirely — instantly blocks ALL of their video access
// and any active session, since getAuthUser also checks isActive and
// tokenVersion.

// Never statically prerendered — this route depends on live auth/DB state.
export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  await dbConnect();
  const { error } = await requireAdminUser(req);
  if (error) return error;

  const user = await User.findByIdAndUpdate(
    params.id,
    { isActive: false, $inc: { tokenVersion: 1 } }, // bump tokenVersion to kill existing session JWTs too
    { new: true }
  );
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ id: user._id, isActive: user.isActive });
}