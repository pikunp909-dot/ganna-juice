import { Router } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, "..", "..", "uploads");
mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${ts}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image uploads are allowed"));
  }
});

// POST /api/upload — single image, returns public URL (served from /uploads).
router.post("/", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file received" });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

router.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Upload failed" });
});

export default router;
