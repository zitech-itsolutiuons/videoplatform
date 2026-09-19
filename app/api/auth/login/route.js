import { NextResponse } from 'next/server';
import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';
import { issueSessionToken } from '../../../../lib/auth';
// app/api/auth/login/route.js

// Never statically prerendered — this route depends on live auth/DB state.
export const dynamic = "force-dynamic";

export async function POST(req) {
  await dbConnect();
  const { email, password } = await req.json();

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = issueSessionToken(user);
  return NextResponse.json({
    token,
    user: { id: user._id, name: user.name, role: user.role },
  });
}