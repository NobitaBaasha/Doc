import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Middleware to verify JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.SESSION_SECRET || 'secret', (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
};

import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register App Storage routes
  registerObjectStorageRoutes(app);

  // Cloudinary Config
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  // Multer Config
  const upload = multer({
    storage: process.env.CLOUDINARY_CLOUD_NAME ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        const isPDF = file.mimetype === 'application/pdf';
        const isImage = file.mimetype.startsWith('image/');
        return {
          folder: 'documents',
          resource_type: isPDF ? 'raw' : (isImage ? 'image' : 'auto'),
          // Remove flags: 'attachment' from here to store clean URLs
          // We handle attachment flag in the frontend for downloads
        };
      },
    }) : multer.memoryStorage() // Fallback if no cloudinary creds yet
  });

  // Auth Routes
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.SESSION_SECRET || 'secret');
      
      await storage.createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'login',
        details: `User registered and logged in as ${user.role}`
      });

      res.status(201).json({ token, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);

      if (!user || !(await bcrypt.compare(input.password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.SESSION_SECRET || 'secret');
      
      await storage.createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'login',
        details: `User logged in as ${user.role}`
      });

      res.json({ token, user });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/documents", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const { filename, fileUrl, allowedRoles } = req.body;
      
      const doc = await storage.createDocument({
        filename,
        fileUrl,
        uploadedBy: user.id,
        allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
      });

      await storage.createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'upload',
        details: `Uploaded file: ${filename}`,
        documentName: filename
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Save failed" });
    }
  });

  app.get(api.documents.list.path, authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const docs = await storage.getDocuments(user.role);
    res.json(docs);
  });

  app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const docId = parseInt(req.params.id);
    
    // Get document first to have the filename for the audit log
    const docs = await storage.getAllDocuments();
    const doc = docs.find(d => d.id === docId);

    await storage.deleteDocument(docId);

    await storage.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'delete',
      details: `Deleted document: ${doc?.filename || 'Unknown'}`,
      documentName: doc?.filename
    });

    res.json({ success: true });
  });

  app.post('/api/documents/:id/log', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const { action } = req.body;
    const docId = parseInt(req.params.id);

    const docs = await storage.getAllDocuments();
    const doc = docs.find(d => d.id === docId);

    await storage.createAuditLog({
      userId: user.id,
      username: user.username,
      action: action,
      details: `${action === 'view' ? 'Viewed' : 'Downloaded'} document: ${doc?.filename || 'Unknown'}`,
      documentName: doc?.filename
    });

    res.json({ success: true });
  });

  app.get('/api/admin/logs', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ message: "Access required" });
    }
    const logs = await storage.getAuditLogs(user.role);
    res.json(logs);
  });

  app.get('/api/teams', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const teams = await storage.getTeams(user.id, user.role);
    res.json(teams);
  });

  app.post('/api/teams', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ message: "Only admins and managers can create teams" });
    }
    const { name, description, memberIds } = req.body;
    const team = await storage.createTeam({
      name,
      description,
      createdBy: user.id
    });

    if (memberIds && Array.isArray(memberIds)) {
      for (const memberId of memberIds) {
        const memberUser = await storage.getUser(memberId);
        if (memberUser) {
          // Admin can add manager and employee, manager can only add employee
          if (user.role === 'admin' || (user.role === 'manager' && memberUser.role === 'employee')) {
            await storage.addTeamMember({
              teamId: team.id,
              userId: memberId,
              role: memberUser.role
            });
          }
        }
      }
    }

    await storage.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'team_create',
      details: `Created team: ${name}`
    });

    res.status(201).json(team);
  });

  app.get('/api/users', authenticateToken, async (req, res) => {
    const users = await storage.getAllUsers();
    // Don't send passwords
    res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role })));
  });

  // Seed Admin User
  const existingAdmin = await storage.getUserByUsername("admin");
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      role: "admin"
    });
    console.log("Seeded admin user: admin / admin123");
  }

  return httpServer;
}
