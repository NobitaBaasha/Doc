import { db } from "./db";
import { users, documents, auditLogs, teams, teamMembers, type User, type InsertUser, type Document, type InsertDocument, type AuditLog, type InsertAuditLog, type Team, type InsertTeam, type TeamMember, type InsertTeamMember } from "@shared/schema";
import { eq, or, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(userRole: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: number): Promise<void>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userRole?: string): Promise<any[]>;

  createTeam(team: InsertTeam): Promise<Team>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeams(userId: number, role: string): Promise<any[]>;
  getTeamMembers(teamId: number): Promise<any[]>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async getDocuments(userRole: string): Promise<any[]> {
    const baseQuery = db.select({
      id: documents.id,
      filename: documents.filename,
      fileUrl: documents.fileUrl,
      uploadedBy: documents.uploadedBy,
      uploaderName: users.username,
      allowedRoles: documents.allowedRoles,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(users, eq(documents.uploadedBy, users.id));

    if (userRole === 'admin') {
      return await baseQuery;
    }

    return await baseQuery.where(sql`${documents.allowedRoles} @> ARRAY[${userRole}]::text[]`);
  }

  async getAllDocuments(): Promise<any[]> {
    return await db.select({
      id: documents.id,
      filename: documents.filename,
      fileUrl: documents.fileUrl,
      uploadedBy: documents.uploadedBy,
      uploaderName: users.username,
      allowedRoles: documents.allowedRoles,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(users, eq(documents.uploadedBy, users.id));
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

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async getTeams(userId: number, role: string): Promise<any[]> {
    if (role === 'admin') {
      return await db.select().from(teams);
    }
    // For managers, show teams they created or are members of
    return await db.select()
      .from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(or(eq(teams.createdBy, userId), eq(teamMembers.userId, userId)));
  }

  async getTeamMembers(teamId: number): Promise<any[]> {
    return await db.select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      username: users.username,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));
  }
}

export const storage = new DatabaseStorage();
