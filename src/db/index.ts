import mongoose from "mongoose";

import { getRequiredEnv } from "#utils";

const connectToDatabase = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(getRequiredEnv("MONGO_URI"));
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

await connectToDatabase();
