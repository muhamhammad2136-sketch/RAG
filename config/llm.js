import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "./env.js";

export const llm = new ChatGoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
  temperature: 0.7,
});