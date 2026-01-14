import { z } from 'zod';
import { insertUserSchema, insertDocumentSchema, users, documents } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  unauthorized: z.object({ message: z.string() }),
  forbidden: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema.pick({ username: true, password: true, role: true }),
      responses: {
        201: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  documents: {
    upload: {
      method: 'POST' as const,
      path: '/api/documents/upload',
      // Input is FormData, handled separately but we can define the schema for other fields if any
      input: z.any(), 
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/documents',
      responses: {
        200: z.array(z.custom<typeof documents.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    logAccess: {
      method: 'POST' as const,
      path: '/api/documents/:id/log',
      input: z.object({ action: z.enum(['view', 'download']) }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  admin: {
    logs: {
      method: 'GET' as const,
      path: '/api/admin/logs',
      responses: {
        200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
