import { Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

type StorageMode = 'replit' | 'filesystem';

function getStorageMode(): StorageMode {
  if (process.env.REPL_ID && process.env.REPLIT_DEV_DOMAIN) {
    return 'replit';
  }
  return 'filesystem';
}

function getLocalStorageDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || './uploads';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class ObjectStorageService {
  private mode: StorageMode;
  private replitClient: any = null;

  constructor() {
    this.mode = getStorageMode();
    console.log(`[ObjectStorage] Using ${this.mode} storage mode`);
    
    if (this.mode === 'replit') {
      this.initReplitClient();
    }
  }

  private async initReplitClient() {
    try {
      const { Client } = await import("@replit/object-storage");
      this.replitClient = new Client();
    } catch (error) {
      console.warn('[ObjectStorage] Failed to initialize Replit client, falling back to filesystem');
      this.mode = 'filesystem';
    }
  }

  async uploadFile(file: Buffer, contentType: string): Promise<string> {
    const ext = this.getExtensionFromContentType(contentType);
    const objectId = `uploads/${randomUUID()}${ext}`;
    
    if (this.mode === 'replit' && this.replitClient) {
      await this.replitClient.uploadFromBytes(objectId, file);
    } else {
      const localPath = path.join(getLocalStorageDir(), objectId);
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localPath, file);
    }
    
    return `/objects/${objectId}`;
  }

  private getExtensionFromContentType(contentType: string): string {
    const map: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    return map[contentType] || '';
  }

  async getObjectUrl(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    
    const objectName = objectPath.replace("/objects/", "");
    
    if (this.mode === 'replit' && this.replitClient) {
      const { ok } = await this.replitClient.exists(objectName);
      if (!ok) {
        throw new ObjectNotFoundError();
      }
    } else {
      const localPath = path.join(getLocalStorageDir(), objectName);
      if (!fs.existsSync(localPath)) {
        throw new ObjectNotFoundError();
      }
    }
    
    return objectPath;
  }

  async downloadObject(objectPath: string, res: Response) {
    try {
      const objectName = objectPath.replace("/objects/", "");
      let data: Buffer;
      
      if (this.mode === 'replit' && this.replitClient) {
        const { ok, value } = await this.replitClient.downloadAsBytes(objectName);
        if (!ok || !value) {
          res.status(404).json({ error: "File not found" });
          return;
        }
        data = Buffer.from(value);
      } else {
        const localPath = path.join(getLocalStorageDir(), objectName);
        if (!fs.existsSync(localPath)) {
          res.status(404).json({ error: "File not found" });
          return;
        }
        data = fs.readFileSync(localPath);
      }

      const ext = objectName.split('.').pop()?.toLowerCase() || '';
      const contentTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
      };
      
      res.set({
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Content-Length": data.length,
        "Cache-Control": "public, max-age=3600",
      });

      res.send(data);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
}

export function isObjectStorageConfigured(): boolean {
  const mode = getStorageMode();
  return mode === 'filesystem' || (mode === 'replit' && !!process.env.REPL_ID);
}
