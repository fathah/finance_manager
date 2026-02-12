import { initDb } from "./db";
import { launchBot } from "./services/bot";
import dotenv from "dotenv";

dotenv.config();

const main = () => {
  try {
    console.log("Starting Finance Manager Bot...");
    initDb();
    launchBot();
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
};

main();
