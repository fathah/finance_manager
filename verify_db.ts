import { initDb } from "./src/db";
import db from "./src/db";
import { DateTime } from "luxon";

console.log("--- STARTING VERIFICATION ---");

// 1. Initialize DB
try {
  initDb();
  console.log("✅ DB Initialized");
} catch (e) {
  console.error("❌ DB Init Failed:", e);
  process.exit(1);
}

// 2. Insert Dummy Record
const dummy = {
  user_id: "12345",
  amount: 100,
  currency: "AED",
  amountInr: 2250, // 100 * 22.5
  rate: 22.5,
  category: "Test",
  description: "Test Transaction",
  raw: "Spent 100 AED on Test",
  date: DateTime.now().toSQL(),
};

try {
  const stmt = db.prepare(`
        INSERT INTO transactions (user_id, amount_original, currency_original, amount_inr, exchange_rate, category, description, raw_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const info = stmt.run(
    dummy.user_id,
    dummy.amount,
    dummy.currency,
    dummy.amountInr,
    dummy.rate,
    dummy.category,
    dummy.description,
    dummy.raw,
    dummy.date,
  );
  console.log(`✅ Inserted record with ID: ${info.lastInsertRowid}`);
} catch (e) {
  console.error("❌ Insert Failed:", e);
  process.exit(1);
}

// 3. Query Record
try {
  const row = db
    .prepare("SELECT * FROM transactions WHERE user_id = ?")
    .get(dummy.user_id);
  console.log("✅ Retrieved Record:", row);
} catch (e) {
  console.error("❌ Query Failed:", e);
  process.exit(1);
}

console.log("--- VERIFICATION COMPLETE ---");
