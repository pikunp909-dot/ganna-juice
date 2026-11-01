import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
import { initSchema } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

import authRoutes from "./routes/auth.js";
import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import settingsRoutes from "./routes/settings.js";
import uploadRoutes from "./routes/upload.js";
import reviewRoutes from "./routes/reviews.js";

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-me-to-a-long-random-string") {
  console.warn("⚠ JWT_SECRET is weak/default. Set a strong random value in .env before going live.");
}

const app = express();
const PORT = Number(process.env.PORT) || 4000;

initSchema();

const origins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use("/uploads", express.static(join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "ganna-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/reviews", reviewRoutes);

// Production — serve the built SPA from web/dist so a single Express
// process handles both the API and the React frontend.
const webDist = join(__dirname, "..", "..", "web", "dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback — let react-router own everything except API/uploads.
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) =>
    res.sendFile(join(webDist, "index.html"))
  );
}

// JSON 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("API error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Ganna API running on http://localhost:${PORT}`);
});
