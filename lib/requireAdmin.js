// lib/requireAdmin.js
// Small shared guard for every /api/admin/* route handler.
import { NextResponse } from 'next/server';
import { getAuthUser } from './auth';

export async function requireAdminUser(req) {
  const user = await getAuthUser(req);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (user.role !== 'Admin') return { error: NextResponse.json({ error: 'Admin only' }, { status: 403 }) };
  return { user };
}
