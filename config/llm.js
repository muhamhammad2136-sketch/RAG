import { ChatOpenAI } from "@langchain/openai";
import { env } from "./env.js";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";


// export const llm = new ChatGroq({
//   apiKey: env.GROQ_API_KEY,
//   model: "llama-3.3-70b-versatile",
//   temperature: 0.2,
//   maxRetries: 2,

// });
// export const llm = new ch({
//   apiKey: env.GROQ_API_KEY,
//   model: "llama-3.3-70b-versatile",
//   temperature: 0.2,
//   maxRetries: 2,


// });


export const llm = new ChatGoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
  maxRetries: 3,        // transient errors (429, 5xx, network) pe auto-retry
  maxOutputTokens: 2048
});

