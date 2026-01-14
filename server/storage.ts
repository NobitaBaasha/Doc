import { db } from "./db";
import { users, documents, auditLogs, type User, type InsertUser, type Document, type InsertDocument, type AuditLog, type InsertAuditLog } from "@shared/schema";
import { eq, or, arrayContains, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(userRole: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: number): Promise<void>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async getDocuments(userRole: string): Promise<Document[]> {
    if (userRole === 'admin') {
      return this.getAllDocuments();
    }
    // Filter by allowed roles
    // Drizzle's array handling for text[]:
    // We want documents where allowedRoles contains userRole
    return await db.select().from(documents).where(arrayContains(documents.allowedRoles, [userRole]));
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }
}

export const storage = new DatabaseStorage();
