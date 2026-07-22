import fs from "fs";
import path from "path";
import {PDFParse} from "pdf-parse";
import Knowledge from "../models/knowledgeSchema.js";
import {
    embedAndStore,
    deleteVectorsByKnowledgeId,
    semanticSearch,
} from "../services/vectorStore.js";

// Helper: extract raw text from a PDF file on disk
const extractPdfText = async (filePath) => {
    try {
        const buffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(buffer);

        const parser = new PDFParse({ data: uint8Array });   // 👈 no "await" here
        const result = await parser.getText();                // 👈 await goes here

        console.log("📄 Extracted text length:", result.text?.length);
        return result.text;
    } catch (err) {
        console.error("❌ pdf-parse failed:", err.message);
        throw new Error(`PDF parsing failed: ${err.message}`);
    }
};

// ---------------------------------------------------------
// POST /api/knowledge/pdf
// ---------------------------------------------------------
export const uploadPdf = async (req, res) => {
    let knowledge;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "PDF file is required." });
        }

        const title = req.body.title || path.parse(req.file.originalname).name;

        knowledge = await Knowledge.create({
            title,
            type: "pdf",
            fileName: req.file.originalname,
            filePath: req.file.path,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            chunkCount: 0,
        });

        const rawText = await extractPdfText(req.file.path);


       
        if (!rawText ) {
            throw new Error(
                "Could not extract any text from this PDF. It may be a scanned/image-only PDF that needs OCR."
            );
        }

        const chunkCount = await embedAndStore({
            knowledgeId: knowledge._id,
            title,
            text: rawText,
            tenantId: req.body.tenantId || "default",
        });

        knowledge.chunkCount = chunkCount;
        await knowledge.save();

        return res.status(201).json({
            success: true,
            message: "PDF uploaded and embedded successfully.",
            data: knowledge,
        });
    } catch (error) {
        console.error("Upload PDF Error:", error);

        if (knowledge?._id) {
            await Knowledge.findByIdAndDelete(knowledge._id).catch(() => {});
        }

        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// POST /api/knowledge/text
// ---------------------------------------------------------
export const uploadText = async (req, res) => {
    let knowledge;
    try {
        const { title, content, tenantId } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, message: "Title and content are required." });
        }

        knowledge = await Knowledge.create({ title, type: "text", content });

        const chunkCount = await embedAndStore({
            knowledgeId: knowledge._id,
            title,
            text: content,
            tenantId: tenantId || "default",
        });

        knowledge.chunkCount = chunkCount;
        await knowledge.save();

        return res.status(201).json({
            success: true,
            message: "Text knowledge uploaded and embedded successfully.",
            data: knowledge,
        });
    } catch (error) {
        console.error("Upload Text Error:", error);

        if (knowledge?._id) {
            await Knowledge.findByIdAndDelete(knowledge._id).catch(() => {});
        }

        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// GET /api/knowledge
// ---------------------------------------------------------
export const getAllKnowledge = async (req, res) => {
    try {
        const items = await Knowledge.find({ status: "active" }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: items });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// GET /api/knowledge/:id
// ---------------------------------------------------------
export const getKnowledgeById = async (req, res) => {
    try {
        const item = await Knowledge.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Not found." });
        return res.status(200).json({ success: true, data: item });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// PUT /api/knowledge/:id  (manual text update -> re-embed)
// ---------------------------------------------------------
export const updateText = async (req, res) => {
    try {
        console.log("update kro")
        const { title, content, tenantId } = req.body;
        const item = await Knowledge.findById(req.params.id);

        if (!item) return res.status(404).json({ success: false, message: "Not found." });
        if (item.type !== "text") {
            return res.status(400).json({
                success: false,
                message: "Only text knowledge can be updated via this route.",
            });
        }

        if (title) item.title = title;
        if (content) item.content = content;

        // Agar content change hua hai to purani vectors delete karke naye banao
        if (content) {
            await deleteVectorsByKnowledgeId(item._id);

            const chunkCount = await embedAndStore({
                knowledgeId: item._id,
                title: item.title,
                text: item.content,
                tenantId: tenantId || "default",
            });

            item.chunkCount = chunkCount;
        }

        await item.save();

        return res.status(200).json({ success: true, message: "Updated and re-embedded.", data: item });
    } catch (error) {
        console.error("Update Text Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// PUT /api/knowledge/:id/replace  (new PDF replaces old -> re-embed)
// ---------------------------------------------------------
export const replacePdf = async (req, res) => {
    try {
        console.log("hey ")
        const item = await Knowledge.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Not found." });
        if (item.type !== "pdf") {
            return res.status(400).json({ success: false, message: "This knowledge item isn't a PDF." });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "New PDF file is required." });
        }

        // old file disk se delete
        if (item.filePath && fs.existsSync(item.filePath)) {
            fs.unlinkSync(item.filePath);
        }

        // old vectors Qdrant se delete
        await deleteVectorsByKnowledgeId(item._id);

        item.fileName = req.file.originalname;
        item.filePath = req.file.path;
        item.mimeType = req.file.mimetype;
        item.fileSize = req.file.size;

        const rawText = await extractPdfText(req.file.path);

        const chunkCount = await embedAndStore({
            knowledgeId: item._id,
            title: item.title,
            text: rawText,
            tenantId: req.body.tenantId || "default",
        });

        item.chunkCount = chunkCount;
        await item.save();

        return res.status(200).json({ success: true, message: "PDF replaced and re-embedded.", data: item });
    } catch (error) {
        console.error("Replace PDF Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// DELETE /api/knowledge/:id
// ---------------------------------------------------------
export const deleteKnowledge = async (req, res) => {
    try {
        const item = await Knowledge.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Not found." });

        if (item.type === "pdf" && item.filePath && fs.existsSync(item.filePath)) {
            fs.unlinkSync(item.filePath);
        }

        await deleteVectorsByKnowledgeId(item._id);

        await item.deleteOne();
        // status="deleted" rakhna ho (soft delete) to upar wali line hata kar:
        // item.status = "deleted"; await item.save();

        return res.status(200).json({ success: true, message: "Deleted from MongoDB and Qdrant." });
    } catch (error) {
        console.error("Delete Knowledge Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// GET /api/knowledge/:id/download
// ---------------------------------------------------------
export const downloadPdf = async (req, res) => {
    try {
        const item = await Knowledge.findById(req.params.id);
        if (!item || item.type !== "pdf" || !item.filePath) {
            return res.status(404).json({ success: false, message: "PDF not found." });
        }
        if (!fs.existsSync(item.filePath)) {
            return res.status(404).json({ success: false, message: "File missing on server." });
        }
        return res.download(item.filePath, item.fileName);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// GET /api/knowledge/search  (MongoDB metadata search)
// ---------------------------------------------------------
export const searchMetadata = async (req, res) => {
    try {
        const { q, type } = req.query;
        const filter = { status: "active" };
        if (type) filter.type = type;
        if (q) filter.title = { $regex: q, $options: "i" };

        const results = await Knowledge.find(filter).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: results });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------
// POST /api/knowledge/test-search  (Qdrant semantic search)
// ---------------------------------------------------------
export const testSemanticSearch = async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, message: "query is required." });
        }

        const results = await semanticSearch({
            query,
           
            limit: limit || 5,
        });

        return res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.error("Test Semantic Search Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};