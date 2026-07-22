import express from "express";
import upload from "../middleware/upload.js";
import {
    uploadPdf,
    uploadText,
    getAllKnowledge,
    getKnowledgeById,
    updateText,
    replacePdf,
    deleteKnowledge,
    downloadPdf,
    searchMetadata,
    testSemanticSearch,
} from "../controllers/knowledgeController.js";

const router = express.Router();


router.post("/pdf", (req, res, next) => {
    console.log("🔥 /pdf route hit, Content-Type:", req.headers["content-type"]);
    next();
}, upload.single("file"), uploadPdf);

router.post("/text", uploadText);
router.get("/search", searchMetadata);
router.post("/test-search", testSemanticSearch);

router.get("/", getAllKnowledge);

// dynamic :id routes LAST
router.get("/:id", getKnowledgeById);
router.put("/:id", updateText);
router.put("/:id/replace", upload.single("file"), replacePdf);
router.delete("/:id", deleteKnowledge);
router.get("/:id/download", downloadPdf);

export default router;