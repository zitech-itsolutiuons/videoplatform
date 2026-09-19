// scripts/convertAndUpload.js
// -----------------------------------------------------------------------------
// Run this LOCALLY, never on Vercel — it shells out to FFmpeg (not available
// in serverless functions) and can take a while for long recordings, far
// beyond any serverless execution limit.
//
// Usage:
//   node scripts/convertAndUpload.js /path/to/recording.mp4 "My Software Demo"
//
// Connects to the SAME MongoDB Atlas cluster your deployed app uses, and
// uploads to the SAME R2 bucket — so as soon as this finishes, the video
// shows up for whoever the admin grants access to on the live site.
// -----------------------------------------------------------------------------
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET } from '../lib/r2Client.js';
import Video from '../models/Video.js';

const execFileAsync = promisify(execFile);

async function convertToHLS(inputPath, workDir) {
  fs.mkdirSync(workDir, { recursive: true });
  const playlistPath = path.join(workDir, 'index.m3u8');

  const args = [
    '-i', inputPath,
    '-c:v', 'libx264', '-c:a', 'aac',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_list_size', '0',
    '-hls_segment_filename', path.join(workDir, 'segment_%03d.ts'),
    playlistPath,
  ];

  console.log('Running ffmpeg...');
  await execFileAsync('ffmpeg', args);
  console.log('HLS conversion complete:', workDir);
  return workDir;
}

async function uploadFolderToR2(localDir, r2Prefix) {
  const files = fs.readdirSync(localDir);
  for (const file of files) {
    const body = fs.readFileSync(path.join(localDir, file));
    const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';

    await r2Client.send(
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: `${r2Prefix}/${file}`, Body: body, ContentType: contentType })
    );
    console.log(`Uploaded ${file} -> r2://${R2_BUCKET}/${r2Prefix}/${file}`);
  }
}

async function main() {
  const [, , inputPath, title] = process.argv;
  if (!inputPath || !title) {
    console.error('Usage: node scripts/convertAndUpload.js <input.mp4> "<Video Title>"');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const video = await Video.create({
    title,
    hls_folder_path: 'pending',
    is_active: false, // flips true only once upload fully succeeds
    allowed_users: [],
    createdBy: process.env.UPLOAD_ADMIN_USER_ID,
  });

  const r2Prefix = `hls/${video._id}`;
  const workDir = path.join(os.tmpdir(), `hls-${video._id}`);

  try {
    await convertToHLS(inputPath, workDir);
    await uploadFolderToR2(workDir, r2Prefix);

    video.hls_folder_path = r2Prefix;
    video.is_active = true;
    await video.save();

    console.log(`\nDone. Video "${title}" is live with id ${video._id}`);
  } catch (err) {
    console.error('Upload pipeline failed:', err);
    await Video.findByIdAndDelete(video._id);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    await mongoose.disconnect();
  }
}

main();
