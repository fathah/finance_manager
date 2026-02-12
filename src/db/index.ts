import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const dbPath = process.env.DB_PATH || "./finance.db";
const db = new Database(dbPath);

export const initDb = () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  console.log("Database initialized");
};

export default db;
