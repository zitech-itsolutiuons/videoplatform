// scripts/createAdmin.js
// Run locally: node scripts/createAdmin.js "Name" email@example.com password
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function main() {
  const [, , name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error('Usage: node scripts/createAdmin.js "Name" email@example.com password');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`A user with that email already exists. _id: ${existing._id}, role: ${existing.role}`);
    if (existing.role !== 'Admin') {
      existing.role = 'Admin';
      await existing.save();
      console.log('-> upgraded to Admin.');
    }
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({ name, email, password, role: 'Admin' });
  console.log('\nAdmin user created.');
  console.log(`  _id:   ${admin._id}`);
  console.log(`  email: ${admin.email}`);
  console.log('\nCopy that _id into .env as:');
  console.log(`  UPLOAD_ADMIN_USER_ID=${admin._id}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
