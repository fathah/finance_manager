import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
import { parseMessage, generateMonthlyReport } from "./ai";
import { convertToINR } from "./currency";
import db from "../db";
import { DateTime } from "luxon";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || "");

// Middleware for error handling
bot.catch((err: any, ctx: Context) => {
  console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.start((ctx) => {
  ctx.reply(
    'Welcome to your Personal Finance Manager! 💰\n\nSend me your expenses or income messages like:\n"Spent 50 AED on groceries"\n"Received 5000 INR salary"\n\nUse /report to see your monthly summary.',
  );
});

bot.help((ctx) => {
  ctx.reply(
    "Send messages to track transactions.\nCommands:\n/report - Get current month summary",
  );
});

bot.command("report", async (ctx) => {
  try {
    const userId = ctx.from.id.toString();
    const startOfMonth = DateTime.now()
      .startOf("month")
      .toSQL({ includeOffset: false });
    const endOfMonth = DateTime.now()
      .endOf("month")
      .toSQL({ includeOffset: false });

    const transactions: any[] = db
      .prepare(
        `
            SELECT * FROM transactions 
            WHERE user_id = ? AND created_at BETWEEN ? AND ?
        `,
      )
      .all(userId, startOfMonth, endOfMonth);

    if (transactions.length === 0) {
      return ctx.reply("No transactions found for this month.");
    }

    const totalInr = transactions.reduce((sum, t) => sum + t.amount_inr, 0);

    ctx.reply("Generating your report... please wait ⏳");
    const report = await generateMonthlyReport(transactions, totalInr);
    ctx.reply(report, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Report Error:", error);
    ctx.reply("Failed to generate report.");
  }
});

bot.on(message("text"), async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id.toString();

  // Ignore commands (technically handled above but good safety)
  if (text.startsWith("/")) return;

  try {
    const parsed = await parseMessage(text);

    if (!parsed) {
      return ctx.reply(
        'I could not understand that transaction. Please try again with a clearer format like "Spent 100 AED on food".',
      );
    }

    const { amount, currency, category, description, date } = parsed;
    const normalizedCurrency = currency || "AED"; // Default to AED if AI didn't catch it

    const { amountInr, rate } = await convertToINR(amount, normalizedCurrency);

    const stmt = db.prepare(`
            INSERT INTO transactions (user_id, amount_original, currency_original, amount_inr, exchange_rate, category, description, raw_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

    // Use parsed date if available, otherwise default valid SQL date
    const createdAt = date
      ? DateTime.fromISO(date).toSQL()
      : DateTime.now().toSQL();

    stmt.run(
      userId,
      amount,
      normalizedCurrency,
      amountInr,
      rate,
      category,
      description,
      text,
      createdAt,
    );

    const responseMsg = `
✅ **Transaction Saved**
Amount: ${amount} ${normalizedCurrency}
Category: ${category}
Converted: ~${amountInr.toFixed(2)} INR
        `.trim();

    ctx.reply(responseMsg, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Transaction Error:", error);
    ctx.reply("Something went wrong processing your transaction.");
  }
});

export const launchBot = () => {
  bot.launch(() => {
    console.log("Bot is running!");
  });

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
};
