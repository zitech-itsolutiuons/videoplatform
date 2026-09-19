// models/Video.js
// A Video row never stores a public URL. `hls_folder_path` is just the R2 key
// prefix — only server-side code ever sees it.
import mongoose from 'mongoose';
import crypto from 'crypto';

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    hls_folder_path: { type: String, required: true },

    // Master kill-switch. Flipping this off makes every subsequent segment
    // request (even mid-playback) fail — checked live, not just at token issue.
    is_active: { type: Boolean, default: true },

    allowed_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    durationSeconds: { type: Number, default: 0 },

    // --- Public, no-login sharing (opt-in per video) ------------------------
    is_public: { type: Boolean, default: false },
    public_share_secret: { type: String, default: null },
  },
  { timestamps: true }
);

videoSchema.methods.regeneratePublicShareSecret = function () {
  this.public_share_secret = crypto.randomBytes(16).toString('hex');
  return this.public_share_secret;
};

export default mongoose.models.Video || mongoose.model('Video', videoSchema);
