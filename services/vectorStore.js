import dotenv from "dotenv"

dotenv.config()
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import {env} from "../config/env.js"; // wherever your env config lives

export const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
});

const COLLECTION_NAME = env.QDRANT_COLLECTION || "langchainjs-testing";
console.log("QDRANT_URL:", process.env.QDRANT_URL);
console.log("QDRANT_KEY:", process.env.QDRANT_API_KEY?.slice(0, 20));
const rawClient = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
    collectionName: "langchainjs-testing"
});




const getStore = () => {
    if (!globalThis.vectorStore) {
        throw new Error("Vector store not initialized yet.");
    }
    return globalThis.vectorStore;
};

const splitText = async (text) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 900,
        chunkOverlap: 180,
        separators: [
        "\n# ",
        "\n## ",
        "\n### ",
        "\n#### ",
        "\n\n",
        "\n",
        ". ",
        "? ",
        "! ",
        "; ",
        ": ",
        ", ",
        " ",
        ""
    ],
    keepSeparator: true,
    });
    return await splitter.splitText(text);
};

/**
 * Embed + store chunks, tagged with knowledgeId so we can delete/update later.
 */
export const embedAndStore = async ({ knowledgeId, title, text, tenantId = "default" }) => {
    const store = getStore();
    const chunks = await splitText(text);

    const docs = chunks.map(
        (chunk, i) =>
            new Document({
                pageContent: chunk,
                metadata: {
                    knowledgeId: knowledgeId.toString(),
                    title,
                    chunkIndex: i,
                    tenantId,
                },
            })
    );

    if (docs.length > 0) {
        await store.addDocuments(docs);
    }

    return docs.length;
};

/**
 * Delete all vectors for a knowledgeId — LangChain wrapper doesn't expose
 * filtered delete directly, so we use the raw client for this.
 */
export const deleteVectorsByKnowledgeId = async (knowledgeId) => {
    await rawClient.delete(COLLECTION_NAME, {
        filter: {
            must: [{ key: "metadata.knowledgeId", match: { value: knowledgeId.toString() } }],
        },
    });
};

/**
 * Semantic search for /test-search and /chat (RAG retrieval).
 */
export const semanticSearch = async ({ query, tenantId = "default", limit = 5 }) => {
    const store = getStore();

    const results = await store.similaritySearchWithScore(query, limit, {
    });

    return results.map(([doc, score]) => ({
        score,
        text: doc.pageContent,
        title: doc.metadata.title,
        chunkIndex: doc.metadata.chunkIndex,
    }));
};