import { Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { config } from "./config";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

type StorageMode = 'replit' | 'supabase' | 'filesystem';

function getLocalStorageDir(): string {
  const dir = config.storage.localDir || './uploads';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class ObjectStorageService {
  private mode: StorageMode;
  private replitClient: any = null;
  private supabaseClient: any = null;
  private supabaseBucket: string;
  private initPromise: Promise<void>;
  private initialized = false;

  constructor() {
    this.mode = config.storage.type;
    this.supabaseBucket = config.storage.supabaseBucket || 'uploads';
    console.log(`[ObjectStorage] Using ${this.mode} storage mode`);
    
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.mode === 'replit') {
      await this.initReplitClient();
    } else if (this.mode === 'supabase') {
      await this.initSupabaseClient();
    }
    
    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  private async initReplitClient() {
    try {
      const { Client } = await import("@replit/object-storage");
      this.replitClient = new Client();
      console.log('[ObjectStorage] Replit client initialized');
    } catch (error) {
      console.warn('[ObjectStorage] Failed to initialize Replit client, falling back to filesystem');
      this.mode = 'filesystem';
    }
  }

  private async initSupabaseClient() {
    try {
      if (config.storage.supabaseUrl && config.storage.supabaseKey) {
        const { createClient } = await import("@supabase/supabase-js");
        this.supabaseClient = createClient(
          config.storage.supabaseUrl,
          config.storage.supabaseKey
        );
        console.log(`[ObjectStorage] Supabase client initialized for bucket: ${this.supabaseBucket}`);
      } else {
        console.warn('[ObjectStorage] Supabase credentials not found, falling back to filesystem');
        this.mode = 'filesystem';
      }
    } catch (error) {
      console.warn('[ObjectStorage] Failed to initialize Supabase client, falling back to filesystem');
      this.mode = 'filesystem';
    }
  }

  async uploadFile(file: Buffer, contentType: string): Promise<string> {
    await this.ensureInitialized();
    
    const ext = this.getExtensionFromContentType(contentType);
    const objectId = `uploads/${randomUUID()}${ext}`;
    
    console.log(`[ObjectStorage] Uploading file: ${objectId}, size: ${file.length} bytes, mode: ${this.mode}`);
    
    if (this.mode === 'replit' && this.replitClient) {
      console.log(`[ObjectStorage] File buffer details: isBuffer=${Buffer.isBuffer(file)}, length=${file.length}`);
      const result = await this.replitClient.uploadFromBytes(objectId, file);
      console.log(`[ObjectStorage] Replit upload result:`, result);
    } else if (this.mode === 'supabase' && this.supabaseClient) {
      const { error } = await this.supabaseClient.storage
        .from(this.supabaseBucket)
        .upload(objectId, file, { contentType, upsert: true });
      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }
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
    await this.ensureInitialized();
    
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    
    const objectName = objectPath.replace("/objects/", "");
    
    if (this.mode === 'replit' && this.replitClient) {
      const { ok } = await this.replitClient.exists(objectName);
      if (!ok) {
        throw new ObjectNotFoundError();
      }
    } else if (this.mode === 'supabase' && this.supabaseClient) {
      const { data, error } = await this.supabaseClient.storage
        .from(this.supabaseBucket)
        .list(path.dirname(objectName), { search: path.basename(objectName) });
      if (error || !data || data.length === 0) {
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
    await this.ensureInitialized();
    
    try {
      const objectName = objectPath.replace("/objects/", "");
      console.log(`[ObjectStorage] Downloading: ${objectName}, mode: ${this.mode}`);
      let data: Buffer;
      
      if (this.mode === 'replit' && this.replitClient) {
        const result = await this.replitClient.downloadAsBytes(objectName);
        console.log(`[ObjectStorage] Replit download result: ok=${result.ok}, hasValue=${!!result.value}, valueLength=${result.value?.length}`);
        if (!result.ok || !result.value) {
          console.log(`[ObjectStorage] File not found in Replit storage: ${objectName}`);
          res.status(404).json({ error: "File not found" });
          return;
        }
        data = Buffer.from(result.value);
      } else if (this.mode === 'supabase' && this.supabaseClient) {
        const { data: fileData, error } = await this.supabaseClient.storage
          .from(this.supabaseBucket)
          .download(objectName);
        if (error || !fileData) {
          res.status(404).json({ error: "File not found" });
          return;
        }
        data = Buffer.from(await fileData.arrayBuffer());
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
  return config.storage.type !== 'filesystem' || !!config.storage.localDir;
}
