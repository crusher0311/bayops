import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const client = new Client();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  async uploadFile(file: Buffer, contentType: string): Promise<string> {
    const objectId = `uploads/${randomUUID()}`;
    await client.uploadFromBytes(objectId, file);
    return `/objects/${objectId}`;
  }

  async getObjectUrl(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const objectName = objectPath.replace("/objects/", "");
    const { ok } = await client.exists(objectName);
    if (!ok) {
      throw new ObjectNotFoundError();
    }
    return objectPath;
  }

  async downloadObject(objectPath: string, res: Response) {
    try {
      const objectName = objectPath.replace("/objects/", "");
      const { ok, value } = await client.downloadAsBytes(objectName);
      
      if (!ok || !value) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const ext = objectName.split('.').pop()?.toLowerCase() || '';
      const contentTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
      };
      
      res.set({
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Content-Length": value.length,
        "Cache-Control": "public, max-age=3600",
      });

      res.send(Buffer.from(value));
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
}
