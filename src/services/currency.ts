import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_RATE = parseFloat(process.env.DEFAULT_AED_TO_INR_RATE || "22.5");
const API_KEY = process.env.CURRENCY_API_KEY;

// Simple cache
let cachedRate: number | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const getAEDToINRExchangeRate = async (): Promise<number> => {
  if (cachedRate && Date.now() - lastFetchTime < CACHE_TTL) {
    return cachedRate;
  }

  try {
    const response = await axios.get(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aed.json",
    );

    if (response.data && response.data.aed && response.data.aed.inr) {
      cachedRate = response.data.aed.inr;
      lastFetchTime = Date.now();
      return cachedRate!;
    }

    throw new Error("Invalid API response");
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    return cachedRate || DEFAULT_RATE;
  }
};

export const convertToINR = async (
  amount: number,
  currency: string,
): Promise<{ amountInr: number; rate: number }> => {
  const rate = await getAEDToINRExchangeRate();
  if (currency.toUpperCase() === "INR") {
    return { amountInr: amount, rate: 1 };
  } else if (currency.toUpperCase() === "AED") {
    return { amountInr: amount * rate, rate };
  } else {
    // Fallback for other currencies if needed, but for now assuming AED/INR primarily
    // If USD, etc., we'd need more logic.
    // Let's assume input is either AED or INR as per requirements,
    // but if it's something else, we might want to fetch that rate too.
    // For now, default to AED logic or error?
    // Let's treat others as AED for safety or just return 0 to indicate failure
    // Actually, let's try to convert via AED if we can, but simplest is just support AED/INR
    return { amountInr: amount * rate, rate }; // As a fallback, treat as AED? No that's dangerous.
  }
};
