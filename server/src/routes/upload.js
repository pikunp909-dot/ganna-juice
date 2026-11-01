import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import requireAdmin from "../middleware/requireAdmin.js";

const router = Router();

// Cloudinary config — set these in server/.env:
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ganna",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    public_id: (_req, file) =>
      `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    transformation: [{ width: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }]
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

// POST /api/upload — single image, returns the secure Cloudinary URL.
router.post("/", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: "No image file received" });
  }
  res.status(201).json({ url: req.file.path });
});

router.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Upload failed" });
});

export default router;
