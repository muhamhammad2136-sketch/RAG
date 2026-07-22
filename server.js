import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createClient } from "redis";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import connectDB ,{disconnectDB }from "./config/db.js";
import {qdrantClient} from "./config/qdrant.js";
import { env } from "./config/env.js";
import { apiRateLimiter,agentRateLimiter } from "./middleware/ratelimiter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorhandler.js";
import knowledgeRoutes from "./routes/knowledgeRoutes.js";
import agentRoutes from "./routes/agent.js";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { redisClient, connectRedis } from "./config/redis.js";

import { QdrantClient } from "@qdrant/js-client-rest";
import multer from "multer";
import dotenv from "dotenv"
dotenv.config()
const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
  next();
});


connectDB();


const allowedOrigins =
    env.ALLOWED_ORIGINS === "*"
        ? "*"
        : env.ALLOWED_ORIGINS.split(",");

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST","PUT","DELETE"],
    })
);

app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        console.log(
            `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`
        );
    });

    next();
});

app.use(apiRateLimiter);

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: env.GOOGLE_API_KEY,
    model: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Knowledge Base",
});

async function initVectorStore() {
    try {

        await qdrantClient.createPayloadIndex("langchainjs-testing", {
            field_name: "metadata.knowledgeId",
            field_schema: "keyword",
        }).catch(() => {});

        console.log("✅ Payload index ready");

        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                url: env.QDRANT_URL,
                apiKey: env.QDRANT_API_KEY,
                collectionName: "langchainjs-testing",
            }
        );

        app.set("vectorStore", vectorStore);
        globalThis.vectorStore = vectorStore;

        console.log("✅ Qdrant Vector Store Initialized");

    } catch (error) {
        console.error("❌ Vector Store Init Failed:", error);
    }
}




app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        vectorStoreReady: !!app.get("vectorStore"),
        redisConnected: redisClient.isReady,
        uptime: process.uptime(),
    });
});

app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/ask", agentRoutes);

app.get("/", (req, res) => {
    res.send("RAG + Agent + Neon Server Running...");
});

app.use(notFoundHandler);
app.use(errorHandler);

let server;

const startServer = async () => {
    await connectRedis();
    await initVectorStore();

    server = app.listen(env.PORT, () => {
        console.log(
            `🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`
        );
    });
};

async function shutdown(signal) {
    console.log(`${signal} received, shutting down gracefully`);

    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log("✅ Redis Disconnected");
        }

        await disconnectDB();

        server?.close(() => {
            console.log("✅ Server Closed");
            process.exit(0);
        });
    } catch (err) {
        console.error("Shutdown Error:", err);
        process.exit(1);
    }

    setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});



startServer();