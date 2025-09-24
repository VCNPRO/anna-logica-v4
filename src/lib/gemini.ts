import { GoogleGenerativeAI } from "@google/generative-ai";

// Obtén tu API Key en: https://aistudio.google.com/app/apikey
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY no está definida. Por favor, añádela a tu archivo .env.local");
}

export const genAI = new GoogleGenerativeAI(apiKey);
