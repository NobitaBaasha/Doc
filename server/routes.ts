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
        const isPDF = file.mimetype === 'application/pdf';
        return {
          folder: 'documents',
          resource_type: isPDF ? 'raw' : 'auto',
          flags: 'attachment'
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
      
      // Get the correct URL from Cloudinary response
      // For resource_type: 'raw', we should use the secure_url
      let fileUrl = (req.file as any).path || (req.file as any).secure_url || `https://mock-storage.com/${req.file.originalname}`;
      
      // If it's a PDF and not already marked as raw in the URL, we might need to adjust it
      // However, CloudinaryStorage usually returns the correct URL if resource_type: 'raw' was used
      if (fileUrl.includes('res.cloudinary.com') && req.file.mimetype === 'application/pdf') {
        // Ensure it doesn't have fl_attachment for the "view" URL if we want it to open in browser
        // We'll store the clean URL and handle fl_attachment in the frontend if needed for download
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
        details: `Uploaded file: ${req.file.originalname}`,
        documentName: req.file.originalname
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
