import mongoose from 'mongoose';

import { env } from './env.js';

export async function connectToDatabase() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
  });
}
