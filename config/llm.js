import { ChatOpenAI } from "@langchain/openai";
import { env } from "./env.js";

export const llm = new ChatOpenAI({
  apiKey: env.XAI_API_KEY,
  model: "grok-4",
  temperature: 0.2,
  configuration: {
    baseURL: "https://api.x.ai/v1",
  },
});