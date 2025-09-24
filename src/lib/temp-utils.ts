import path from 'path';
import fs from 'fs/promises';
import os from 'os';

/**
 * Get the appropriate temporary directory for the current environment
 * Vercel uses /tmp, local development can use system temp or project tmp
 */
export function getTempDir(subDir?: string): string {
  const isVercel = process.env.VERCEL === '1';
  const baseDir = isVercel ? '/tmp' : os.tmpdir();

  if (subDir) {
    return path.join(baseDir, subDir);
  }

  return baseDir;
}

/**
 * Create a temporary file path with proper sanitization
 */
export function createTempFilePath(originalFileName: string, subDir?: string): string {
  // Sanitize filename to prevent path traversal
  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const fileName = `${timestamp}_${sanitizedFileName}`;

  const tempDir = getTempDir(subDir);
  return path.join(tempDir, fileName);
}

/**
 * Ensure temp directory exists
 */
export async function ensureTempDir(subDir?: string): Promise<string> {
  const tempDir = getTempDir(subDir);

  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }

  return tempDir;
}

/**
 * Clean up temporary file
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn('Failed to cleanup temp file:', filePath, error);
  }
}