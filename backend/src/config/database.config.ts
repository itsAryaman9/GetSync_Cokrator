import mongoose from "mongoose";
import { config } from "./app.config";
import { ensureRolesSeeded } from "../seeders/ensure-roles";

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to the Database");
    await ensureRolesSeeded();
  } catch (error) {
    console.log("Error connecting to the database");
    process.exit(1);
  }
};
export default connectDatabase;
