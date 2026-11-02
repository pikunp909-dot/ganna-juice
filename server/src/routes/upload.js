import { Router } from "express";
import multer from "multer";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

// Images are stored as inline base64 data URLs inside the Turso database
// (menu.imageUrl / settings.qrCodeUrl / settings.heroImageUrl). No files are
// written to disk, so nothing is lost when Render's ephemeral disk resets.
// Keep uploads small — Turso's free tier has a 500MB total DB limit.
const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB -> ~667 KB base64

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image uploads are allowed"));
  }
});

// POST /api/upload — single image, returns a data: URL ready to store.
router.post("/", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file received" });
  const { buffer, mimetype } = req.file;
  const b64 = buffer.toString("base64");
  res.status(201).json({ url: `data:${mimetype};base64,${b64}` });
});

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Image too large — max 500 KB" });
  }
  res.status(400).json({ error: err.message || "Upload failed" });
});

export default router;
