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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
        return {
          folder: 'documents',
          resource_type: 'auto', // Important for PDF/Raw files
          flags: 'attachment' // This can sometimes help with direct downloads
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

  // Document Routes
  app.post(api.documents.upload.path, authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = (req as any).user;
      const allowedRoles = req.body.allowedRoles ? JSON.parse(req.body.allowedRoles) : ['admin']; // Default to admin only if not specified
      
      // If cloudinary is not configured, we mock the url
      let fileUrl = (req.file as any).path || `https://mock-storage.com/${req.file.originalname}`;
      
      // Force attachment for download by adding fl_attachment to Cloudinary URL
      if (fileUrl.includes('res.cloudinary.com')) {
        fileUrl = fileUrl.replace('/upload/', '/upload/fl_attachment/');
      }

      const doc = await storage.createDocument({
        filename: req.file.originalname,
        fileUrl: fileUrl,
        uploadedBy: user.id,
        allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
      });

      await storage.createAuditLog({
        userId: user.id,
        username: user.username,
        action: 'upload',
        details: `Uploaded file: ${req.file.originalname} (ID: ${doc.id})`
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.get(api.documents.list.path, authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const docs = await storage.getDocuments(user.role);
    res.json(docs);
  });

  app.post('/api/documents/:id/log', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const { action } = req.body;
    const docId = req.params.id;

    await storage.createAuditLog({
      userId: user.id,
      username: user.username,
      action: action,
      details: `${action === 'view' ? 'Viewed' : 'Downloaded'} document ID: ${docId}`
    });

    res.json({ success: true });
  });

  app.get('/api/admin/logs', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    await storage.createAuditLog({
      userId: user.id,
      username: user.username,
      action: 'logout',
      details: 'User logged out'
    });
    res.json({ success: true });
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
