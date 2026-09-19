// lib/db.js
// -----------------------------------------------------------------------------
// Serverless functions can be invoked many times per minute, each potentially
// a fresh execution environment. Without caching, every request would open a
// brand new Mongoose connection — slow, and it can exhaust Atlas's connection
// limit fast. This caches the connection on the global object, which Vercel's
// Node.js runtime reuses across invocations of a "warm" function instance.
// -----------------------------------------------------------------------------
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, { bufferCommands: false }).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
