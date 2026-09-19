// models/User.js
// -----------------------------------------------------------------------------
// `isActive` is the kill-switch: an Admin flips a Viewer to isActive=false and
// every subsequent request is rejected because the API routes re-check this
// field live in the DB on every stream-token issuance AND every segment
// fetch — not just at login.
// -----------------------------------------------------------------------------
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['Admin', 'Viewer'], default: 'Viewer' },
    isActive: { type: Boolean, default: true },
    // Bumping this invalidates every previously-issued session JWT for this
    // user without needing a server-side token blacklist.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  // Async pre-hooks in modern Mongoose take NO `next` callback — just return.
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Next.js hot-reloads modules in dev, which would redefine the model on every
// reload and throw "OverwriteModelError" — reuse the existing model if present.
export default mongoose.models.User || mongoose.model('User', userSchema);
