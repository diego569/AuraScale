import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Dev-only local-disk backend. Files are private (served only through the
// authenticated proof route, never from /public) but this does not survive
// redeploys on most hosts and must be replaced with a real object store
// (S3/R2/Vercel Blob) before real payment proofs are handled in production.
const STORAGE_ROOT = path.resolve(process.cwd(), ".local-storage");

export interface PutObjectResult {
  key: string;
  sha256: string;
  sizeBytes: number;
}

function resolveObjectPath(key: string) {
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid object key.");
  }
  return resolved;
}

export const storage = {
  async putObject(key: string, data: Buffer): Promise<PutObjectResult> {
    const filePath = resolveObjectPath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return {
      key,
      sha256: createHash("sha256").update(data).digest("hex"),
      sizeBytes: data.byteLength,
    };
  },

  async getObject(key: string): Promise<Buffer | null> {
    try {
      return await readFile(resolveObjectPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  },
};
