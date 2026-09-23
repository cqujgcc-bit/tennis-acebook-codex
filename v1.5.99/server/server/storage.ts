// Local filesystem storage helpers (self-hosted, replaces Manus Forge/S3).
// Files are written under STORAGE_DIR and served at /manus-storage/{key}.
// URL format is kept identical to the original Manus implementation so that
// no frontend code or existing stored paths need to change.
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Base directory for all uploaded files. Configurable via env, defaults to
// a `storage-data` folder next to the running process.
export function getStorageDir(): string {
  return process.env.STORAGE_DIR || path.resolve(process.cwd(), "storage-data");
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

// Prevent path traversal: resolved path must stay inside the storage dir.
export function resolveSafePath(relKey: string): string {
  const base = getStorageDir();
  const target = path.resolve(base, normalizeKey(relKey));
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("Invalid storage key (path traversal)");
  }
  return target;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const target = resolveSafePath(key);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  const buffer =
    typeof data === "string"
      ? Buffer.from(data)
      : Buffer.isBuffer(data)
        ? data
        : Buffer.from(data as Uint8Array);
  await fs.promises.writeFile(target, buffer);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

// For local storage the file is directly accessible; no signing needed.
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/manus-storage/${key}`;
}
