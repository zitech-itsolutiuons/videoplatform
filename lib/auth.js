// lib/auth.js
// -----------------------------------------------------------------------------
// Same two-token design as before, adapted for Next.js Route Handlers instead
// of Express middleware:
//
// 1. SESSION JWT (1 day) — issued at POST /api/auth/login. Identifies the
//    logged-in user for normal API calls.
// 2. STREAM JWT (5 min) — issued at POST /api/auth/stream-token/:videoId
//    (or the public variant). Scoped to one (user or "public", videoId) pair.
//    This is what the player attaches to every segment request. Even though
//    it's short-lived, permissions are STILL re-checked live in Mongo on
//    every single segment fetch — see app/api/stream/.../route.js — so
//    revocation doesn't wait for the token to expire.
// -----------------------------------------------------------------------------
import jwt from 'jsonwebtoken';
import { dbConnect } from './db';
import User from '../models/User';

const SESSION_SECRET = process.env.JWT_SESSION_SECRET;
const STREAM_SECRET = process.env.JWT_STREAM_SECRET; // use a DIFFERENT secret than session

export function issueSessionToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion, role: user.role }, SESSION_SECRET, {
    expiresIn: '1d',
  });
}

export function issueStreamToken(userId, videoId) {
  return jwt.sign({ sub: String(userId), vid: String(videoId) }, STREAM_SECRET, { expiresIn: '5m' });
}

// Public variant: no `sub` — just proof the caller knew the video's current
// public_share_secret at issuance time.
export function issuePublicStreamToken(videoId) {
  return jwt.sign({ vid: String(videoId), pub: true }, STREAM_SECRET, { expiresIn: '5m' });
}

export function verifyStreamToken(token) {
  return jwt.verify(token, STREAM_SECRET); // throws if invalid/expired
}

// Extracts + validates the session JWT from a NextRequest's Authorization
// header, and re-checks the user is still active + the token wasn't
// invalidated by a tokenVersion bump. Returns the User doc or null.
export async function getAuthUser(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, SESSION_SECRET);
  } catch {
    return null;
  }

  await dbConnect();
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) return null;
  if (user.tokenVersion !== payload.tv) return null; // force-logged-out since token issue

  return user;
}
