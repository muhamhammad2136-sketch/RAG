import mongoose from "mongoose";

const knowledgeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            enum: ["pdf", "text"],
            required: true,
        },

        fileName: {
            type: String,
            default: null,
        },

        filePath: {
            type: String,
            default: null,
        },

        content: {
            type: String,
            default: null,
        },

        mimeType: {
            type: String,
            default: null,
        },

        fileSize: {
            type: Number,
            default: 0,
        },

        chunkCount: {
            type: Number,
            default: 0,
        },

        embeddingModel: {
            type: String,
            default: "text-embedding-3-small",
        },

        status: {
            type: String,
            enum: ["active", "deleted"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Knowledge", knowledgeSchema);