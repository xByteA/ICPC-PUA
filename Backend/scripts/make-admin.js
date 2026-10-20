import mongoose from 'mongoose';
import '../src/config/env.js';
import User from '../src/models/User.js';

const email = process.argv[2]?.toLowerCase().trim();
if (!email) {
  console.error('Usage: npm run make-admin -- user@example.com');
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await User.updateOne({ email }, { $set: { role: 'admin' } });
    if (!result.matchedCount) {
      console.error(`No user account found for ${email}. Register that user first.`);
      process.exitCode = 1;
    } else {
      console.log(`Administrator access granted to ${email}.`);
    }
  } catch (error) {
    console.error('Could not grant administrator access.', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
