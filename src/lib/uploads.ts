import path from "path";
import fs from "fs/promises";

// Uploads live on the server disk. On Docker/Railway, mount a persistent
// volume at this path (UPLOAD_DIR) so files survive redeploys.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
export const PAYMENTS_DIR = path.join(UPLOAD_ROOT, "payments");

export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const MAX_BYTES = 5 * 1024 * 1024;

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
