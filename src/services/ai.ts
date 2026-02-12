import OpenAI from "openai";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();

const openai = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface ParsedTransaction {
  amount: number;
  currency: string;
  category: string;
  description: string;
  date?: string; // ISO string if extracted, else undefined
}

export const parseMessage = async (
  message: string,
): Promise<ParsedTransaction | null> => {
  try {
    const currentDate = DateTime.now().toFormat("yyyy-MM-dd");
    const response = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo", // Can be changed via env if needed
      messages: [
        {
          role: "system",
          content: `You are a financial assistant. parse the following message into a JSON object with fields: 
                    - amount (number)
                    - currency (string, ISO code e.g. AED, INR. Default to AED if not specified but context implies currency)
                    - category (string, short category e.g. Food, Transport, Salary)
                    - description (string, brief description)
                    - date (string, ISO YYYY-MM-DD, default to today: ${currentDate} if not specified)
                    If the message is not a financial transaction, return null.
                    Output only raw JSON.`,
        },
        { role: "user", content: message },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // rudimentary cleanup if markdown code blocks are used
    const cleanContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("AI Parse Error:", error);
    return null;
  }
};

export const generateMonthlyReport = async (
  transactions: any[],
  totalInr: number,
): Promise<string> => {
  try {
    // Summarize by category locally to save tokens
    const categorySummary: { [key: string]: number } = {};
    transactions.forEach((t) => {
      const cat = t.category || "Uncategorized";
      categorySummary[cat] = (categorySummary[cat] || 0) + t.amount_inr;
    });

    const summaryText = JSON.stringify({
      total_spent_inr: totalInr,
      category_breakdown: categorySummary,
      transaction_count: transactions.length,
    });

    const response = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a financial analyst. Provide a helpful, encouraging, and insightful end-of-month report based on the provided JSON summary.
                    The user is Indian, living in UAE. Report currency is INR.
                    Highlight biggest spending categories.
                    Keep it concise and formatted in Markdown.`,
        },
        { role: "user", content: summaryText },
      ],
    });

    return (
      response.choices[0]?.message?.content || "Failed to generate report."
    );
  } catch (error) {
    console.error("AI Reporting Error:", error);
    return "Error generating AI report.";
  }
};
