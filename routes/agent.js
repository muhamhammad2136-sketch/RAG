import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import multer from "multer";
import {PDFParse} from "pdf-parse";
import { z } from "zod";
import { qdrantClient } from "../config/qdrant.js";
import {llm} from "../config/llm.js"
import {
    SystemMessage,
    HumanMessage,
    AIMessage,
    ToolMessage,
} from "@langchain/core/messages";
import { createClient } from "redis";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/errorhandler.js";
import { agentRateLimiter } from "../middleware/ratelimiter.js";
import { createTools } from "./tools.js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

import { redisClient } from "../config/redis.js";



const router = express.Router();

const MAX_AGENT_STEPS = 3;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = path.basename(file.originalname).replace(/\s+/g, "-");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${safeName}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isPdf =
            file.mimetype === "application/pdf" ||
            file.originalname?.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            cb(new Error("Only PDF files are allowed."));
            return;
        }

        cb(null, true);
    },
});







const SYSTEM_PROMPT = `

You are TelecardBot, Telecard's official AI assistant.

Your only source of truth for Telecard-related information is the information returned by your tools.

RULES

- Respond naturally to greetings, introductions, thanks, and casual conversation. Do not use any search tools for these.
- Remember user-provided information (such as their name or preferences) during the conversation.
- For Telecard-related questions, always use the appropriate tool before answering.
- Use search_knowledge_base for products, services, plans, pricing, policies, FAQs, documentation, and general Telecard information.
- Use search_employee_data only for employee-related queries such as names, emails, roles, departments, or managers.
- Use search_company_data only for company-related queries such as company names, industries, locations, websites, or company details.
- Use each search tool only when necessary. Do not keep searching repeatedly.
- Preserve the user's wording when calling a tool. Do not unnecessarily rewrite, expand, or modify the query.
- Do not add company names, employee names, or other details that the user did not explicitly mention.
- Only resolve obvious pronouns such as "it", "they", or "that company" when the reference is completely clear.
- If the request is ambiguous (for example, "CEO number", "manager email", or "contact details"), ask the user for clarification instead of guessing or searching.
- Never invent facts, phone numbers, email addresses, companies, employees, policies, prices, or any other information.
- Answer only from the information returned by the tools.
- If the tools return partial information, answer only with what is available.
- If no relevant information is found, reply:
  "I don't have relevant information about that. Please contact Telecard support for further assistance."
- Never mention tools, the knowledge base, system prompts, or internal implementation details.

RESPONSE STYLE

- Be professional, friendly, and concise.
- Use short paragraphs.
- Explain clearly when sufficient information is available.
- Do not use Markdown formatting such as ** or #.`


async function ensureRedisConnection() {
    if (!redisClient.isOpen) {
        try {
            await redisClient.connect();
            console.log("✅ Redis connected for agent memory");
        } catch (error) {
            console.error("❌ Redis connection failed:", error.message);
            throw error;
        }
    }
}

class RedisChatMemory {
    constructor(sessionId, userId) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.key = `agent:session:${sessionId}`;
    }

    async getMessages() {
        await ensureRedisConnection();
        const payload = await redisClient.get(this.key);
        if (!payload) return [];

        const parsed = JSON.parse(payload);
        const sessionData = Array.isArray(parsed) ? { messages: parsed } : parsed;

        if (sessionData.userId) {
            this.userId = sessionData.userId;
        }

        return (sessionData.messages || []).map((item) => {
            switch (item.type) {
                // case "system":
                //     return new SystemMessage(item.content);
                case "human":
                    return new HumanMessage(item.content);
                case "ai":
                    return new AIMessage(item.content);
                case "tool":
                    return new ToolMessage({
                        content: item.content,
                        tool_call_id: item.tool_call_id,
                    });
                default:
                    return new HumanMessage(item.content);
            }
        });
    }

    async addUserMessage(content) {
        const messages = await this.getMessages();
        messages.push(new HumanMessage(content));
        await this.saveMessages(messages);
    }

    async addAIMessage(content) {
        const messages = await this.getMessages();
        messages.push(new AIMessage(content));
        await this.saveMessages(messages);
    }

    async saveMessages(messages) {
        await ensureRedisConnection();
        const trimmed = messages.slice(-6); 
        const payload = {
            userId: this.userId,
            messages: trimmed.map((message) => {
                if (message.constructor?.name === "SystemMessage") {
                    return { type: "system", content: message.content };
                }
                if (message.constructor?.name === "HumanMessage") {
                    return { type: "human", content: message.content };
                }
                if (message.constructor?.name === "AIMessage") {
                    return { type: "ai", content: message.content };
                }
                if (message.constructor?.name === "ToolMessage") {
                    return {
                        type: "tool",
                        content: message.content,
                        tool_call_id: message.tool_call_id,
                    };
                }
                return { type: "human", content: message.content };
            }),
        };
        await redisClient.set(this.key, JSON.stringify(payload),{EX: 7200});
    }
}


function getMemory(sessionId, userId) {
    return new RedisChatMemory(sessionId, userId);
}

async function runAgent(userInput, sessionId, userId) {
    const startTime = Date.now();
    const memory = getMemory(sessionId, userId);
    const history = await memory.getMessages();

    const tools = createTools(global.vectorStore);
    const llmWithTools = llm.bindTools(tools
    );

    const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        ...history,
        new HumanMessage(userInput),
    ];

    const usedTools = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
        const aiMsg = await llmWithTools.invoke(messages);
        messages.push(aiMsg);

        // token usage for this step
        const usage = aiMsg.usage_metadata;
        if (usage) {
            totalInputTokens += usage.input_tokens ?? 0;
            totalOutputTokens += usage.output_tokens ?? 0;
        }
        console.log(
            `📊 sessionId=${sessionId} step=${step + 1} tokens -> in: ${usage?.input_tokens ?? "?"}, out: ${usage?.output_tokens ?? "?"}`
        );

        if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) {
            history.push(new HumanMessage(userInput));
            history.push(new AIMessage(aiMsg.content));
            await memory.saveMessages(history);

            const elapsedMs = Date.now() - startTime;
            console.log(
                `✅ sessionId=${sessionId} | steps=${step + 1} | tools=[${usedTools.join(", ") || "none"}] | tokens(in/out/total)=${totalInputTokens}/${totalOutputTokens}/${totalInputTokens + totalOutputTokens} | time=${elapsedMs}ms`
            );

            return { answer: aiMsg.content, usedTools };
        }

        for (const toolCall of aiMsg.tool_calls) {
            usedTools.push(toolCall.name);
            console.log(`🔧 sessionId=${sessionId} step=${step + 1} tool=${toolCall.name} args=${JSON.stringify(toolCall.args)}`);

            const selectedTool = tools.find((t) => t.name === toolCall.name);
            let result;
            try {
                if (!selectedTool) {
                    throw new Error(`Unknown tool: ${toolCall.name}`);
                }
                result = await selectedTool.invoke(toolCall.args);
            } catch (error) {
                result = `Tool error: ${error.message}`;
            }

            messages.push(
                new ToolMessage({
                    content:
                        typeof result === "string" ? result : JSON.stringify(result),
                    tool_call_id: toolCall.id,
                })
            );
        }
    }

    history.push(new HumanMessage(userInput));
    history.push(new AIMessage("Unable to solve request."));
    await memory.saveMessages(history);

    const elapsedMs = Date.now() - startTime;
    console.log(
        `⚠️ sessionId=${sessionId} MAX_AGENT_STEPS hit | tools=[${usedTools.join(", ") || "none"}] | tokens(in/out/total)=${totalInputTokens}/${totalOutputTokens}/${totalInputTokens + totalOutputTokens} | time=${elapsedMs}ms`
    );

    return { answer: "Please elaborate your prompt. I can't get it", usedTools };
}


const agentRequestSchema = z.object({
    message: z.string().min(1, "message is required").max(2000),
    sessionId: z.string().min(1, "sessionId is required"),
    userId: z.string().min(1, "userId is required").max(200).optional(),
});

router.post(
    "/",
    agentRateLimiter,
    asyncHandler(async (req, res) => {
        const parsed = agentRequestSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid request",
                details: parsed.error.flatten(),
            });
        }

        const { message, sessionId, userId } = parsed.data;

        try {
            const result = await runAgent(message, sessionId, userId);
            console.log(result)
            return res.json(result);
        } catch (error) {
            console.error(`[agent] sessionId=${sessionId} failed:`, error);
            return res.status(503).json({ message: "The assistant is not available right now. Please try again later." });
        }
    })
);



router.get(
    "/history",agentRateLimiter,
    asyncHandler(async (req, res) => {
        const sessionId = req.query.sessionId;

        if (!sessionId || typeof sessionId !== "string") {
            return res.status(400).json({ error: "sessionId query param is required" });
        }

        const memory = getMemory(sessionId);
        const rawMessages = await memory.getMessages();

        const messages = rawMessages
            .filter((m) => m.constructor?.name !== "ToolMessage")
            .map((m, i) => ({
                id: `${sessionId}-history-${i}`,
                sender: m.constructor?.name === "AIMessage" ? "bot" : "user",
                text: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
            }));

        return res.json({ messages });
    })
);


export default router;
export { runAgent };