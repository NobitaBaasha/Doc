import { db } from "./db";
import { users, documents, auditLogs, type User, type InsertUser, type Document, type InsertDocument, type AuditLog, type InsertAuditLog } from "@shared/schema";
import { eq, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(userRole: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: number): Promise<void>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userRole?: string): Promise<any[]>;
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
    // We want documents where allowedRoles contains userRole
    // Using sql query since arrayContains might be tricky with text[] depending on drizzle version
    return await db.select().from(documents).where(sql`${documents.allowedRoles} @> ARRAY[${userRole}]::text[]`);
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

  async getAuditLogs(userRole?: string): Promise<any[]> {
    if (userRole === 'admin') {
      return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
    }
    
    if (userRole === 'manager') {
      // Join with users to only get logs for employees
      return await db.select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        username: auditLogs.username,
        action: auditLogs.action,
        details: auditLogs.details,
        documentName: auditLogs.documentName,
        timestamp: auditLogs.timestamp,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(users.role, 'employee'))
      .orderBy(desc(auditLogs.timestamp));
    }

    return [];
  }
}

export const storage = new DatabaseStorage();
