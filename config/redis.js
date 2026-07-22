import { createClient } from "redis";
import { env } from "./env.js";

export const redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
        tls: env.REDIS_URL.startsWith("rediss://"),
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    },
});

redisClient.on("error", (err) => {
    console.error("❌ Redis Error:", err.message);
});

export async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log("✅ Redis Connected (Upstash)");
    }
    return redisClient;
}