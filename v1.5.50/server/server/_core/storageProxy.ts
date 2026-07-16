import type { Express } from "express";
import fs from "fs";
import path from "path";
import { getStorageDir, resolveSafePath } from "../storage";

// Common content types for served files.
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

// Serve uploaded files directly from the local filesystem.
// Keeps the original /manus-storage/{key} URL contract intact.
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    let filePath: string;
    try {
      filePath = resolveSafePath(key);
    } catch {
      res.status(400).send("Invalid storage key");
      return;
    }

    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) {
        res.status(404).send("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.status(404).send("Not found");
    }
  });

  // Ensure storage directory exists at startup.
  fs.promises.mkdir(getStorageDir(), { recursive: true }).catch(() => {});
}
