import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/env.js';

try {
  await mongoose.connect(config.mongoUri);
  app.listen(config.port,"0.0.0.0", () => {
    console.log(`PUA ICPC Community API listening on port ${config.port}`);
  });
} catch (error) {
  console.error('Could not connect to MongoDB or start the API.', error);
  process.exitCode = 1;
}
