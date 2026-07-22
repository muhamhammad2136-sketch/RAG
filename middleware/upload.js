import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
console.log("📁 Upload dir:", uploadDir, "exists:", fs.existsSync(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("➡️ destination hit for:", file.originalname);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        console.log("➡️ filename hit for:", file.originalname, file.mimetype);
        const safeName = path.basename(file.originalname).replace(/\s+/g, "-");
        cb(null, `${randomUUID()}-${safeName}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        console.log("➡️ fileFilter hit:", file.originalname, file.mimetype);
        const isPdf =
            file.mimetype === "application/pdf" ||
            file.originalname.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            console.log("❌ Rejected — not a PDF");
            return cb(new Error("Only PDF files are allowed."));
        }
        cb(null, true);
    },
});

export default upload;