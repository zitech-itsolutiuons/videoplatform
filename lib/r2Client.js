// lib/r2Client.js
// Cloudflare R2 is S3-API-compatible — the standard AWS SDK v3 S3 client
// works against it by pointing `endpoint` at your R2 account endpoint and
// using R2 access keys instead of AWS ones.
import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://<accountid>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME;
