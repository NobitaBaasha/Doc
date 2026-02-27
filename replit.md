# DocVault

## Overview

DocVault is a role-based document management system that allows organizations to securely upload, store, and share documents with role-based access control. The application features user authentication with JWT tokens, document uploads via Cloudinary, and comprehensive audit logging for compliance tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system (Inter + Outfit fonts)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: REST API with typed route definitions in shared/routes.ts
- **Authentication**: JWT tokens stored in localStorage, verified via middleware
- **File Uploads**: Multer with Cloudinary storage integration

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: shared/schema.ts (shared between frontend and backend)
- **Tables**: users, documents, auditLogs
- **Migrations**: Drizzle Kit with push command (db:push)

### Authentication Flow
1. User registers/logs in via /api/auth endpoints
2. Server returns JWT token and user object
3. Client stores token in localStorage
4. All API requests include Authorization: Bearer header
5. Server middleware validates token on protected routes

### Key Design Patterns
- **Shared Types**: Schema and route definitions shared between client/server via @shared alias
- **Type-Safe API**: Zod schemas define request/response shapes in shared/routes.ts
- **Storage Abstraction**: IStorage interface in server/storage.ts for database operations
- **Protected Routes**: React component wrapper checks auth state before rendering

## External Dependencies

### Database
- PostgreSQL (required, connection via DATABASE_URL environment variable)
- Drizzle ORM for type-safe queries

### File Storage
- Cloudinary for document uploads (optional, falls back to memory storage)
- Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

### Authentication
- bcryptjs for password hashing
- jsonwebtoken for JWT generation/verification
- SESSION_SECRET environment variable for JWT signing

### Key npm Packages
- @tanstack/react-query: Server state management
- @radix-ui/*: Accessible UI primitives
- framer-motion: Animations
- date-fns: Date formatting
- zod: Schema validation
- drizzle-orm + drizzle-kit: Database ORM and migrations