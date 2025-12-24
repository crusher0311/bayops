import { contactRequests, type InsertContactRequest, type ContactRequest } from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  createContactRequest(request: InsertContactRequest): Promise<ContactRequest>;
}

export class DatabaseStorage implements IStorage {
  async createContactRequest(insertRequest: InsertContactRequest): Promise<ContactRequest> {
    const [request] = await db
      .insert(contactRequests)
      .values(insertRequest)
      .returning();
    return request;
  }
}

export const storage = new DatabaseStorage();
