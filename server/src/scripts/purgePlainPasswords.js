/**
 * One-off: delete the plaintext password copies older builds stored on users.
 * Hashes are untouched, so everyone can still sign in.
 *   npm run purge:plain-passwords
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';

await mongoose.connect(env.mongoUri);
const result = await mongoose.connection.collection('users').updateMany(
    { passwordPlain: { $exists: true } },
    { $unset: { passwordPlain: '' } }
);
console.log(`Removed plaintext passwords from ${result.modifiedCount} user(s).`);
await mongoose.disconnect();
