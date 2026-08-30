# Architecture

## 1. Moving Pieces and Communication
The application is structured into decoupled frontend, backend, and data tiers:

```
┌────────────────────────────────────────────────────────┐
│                   React 18 + Vite                      │
│   (AuthContext, LoginForm, UserBadge, SessionView)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST (JSON + Bearer JWT)
┌───────────────────────────▼────────────────────────────┐
│                  Express.js API Layer                  │
│  - Middleware: RequestLogger, Authenticate, RequireRole │
│  - Routers: HealthRouter, AuthRouter, TestRbacRouter   │
│  - Services: AuthService, Password (Bcrypt), JWT (HS256)│
│  - Repositories: UserRepository                        │
└───────────────────────────┬────────────────────────────┘
                            │ SQL via pg Pool
┌───────────────────────────▼────────────────────────────┐
│                   PostgreSQL Database                  │
│  - Schema: users (UUID PK, UNIQUE email, CHECK role)   │
│  - Migrations: schema_migrations tracker               │
└────────────────────────────────────────────────────────┘
```

- **Frontend (Client)**: React 18 single-page application built with Vite and TypeScript. Manages client-side authentication state via `AuthContext`, stores JWT token in `localStorage`, and handles presentation.
- **Backend (Server)**: Node.js + Express API in TypeScript. Provides input validation (Zod), centralized error handling (`AppError`), JWT signing/verification, password hashing (`bcryptjs`), and server-side RBAC middleware (`requireRole`).
- **Database (PostgreSQL)**: Stores user accounts with salted password hashes and strict role constraints (`manager`, `waiter`).

---

## 2. Where Each Piece Runs
- **Client**: Runs in the user's browser, communicating with the API via asynchronous `fetch` requests.
- **Server**: Node.js runtime process (e.g. on port 4000 locally, or deployed on Render/container host).
- **Database**: PostgreSQL 14+ database instance (e.g. port 5432 locally, or managed Supabase/Neon in production).

---

## 3. End-to-End Request Path: Authenticated Action

### Example: Accessing a Manager-Protected Route (`GET /api/test-rbac/manager-only`)
1. **Client**: The browser sends an HTTP `GET` request to `/api/test-rbac/manager-only` with header `Authorization: Bearer <jwt_token>`.
2. **CORS & Logging**: `cors()` middleware checks origin; `requestLogger` logs the incoming request method, path, and client IP.
3. **Authentication Middleware (`authenticate`)**:
   - Parses the `Bearer` token from the `Authorization` header.
   - Verifies the cryptographic signature and expiration using `JWT_SECRET`.
   - Queries `userRepository.findById(decoded.userId)` to confirm user exists in the database.
   - Attaches sanitized server-verified user to `req.user`.
4. **RBAC Middleware (`requireManager`)**:
   - Checks `req.user.role === 'manager'`.
   - If user role is `'waiter'`, immediately halts execution and passes `AppError.forbidden(...)` (HTTP 403) to the centralized error handler.
   - If role matches `'manager'`, passes control to the route handler via `next()`.
5. **Route Handler**: Constructs response payload and returns HTTP 200 `{ status: 'success', data: ... }`.
6. **Error Handler (if rejected)**: Centralized `errorHandler` maps `AppError` to standard JSON envelope `{ status: 'error', statusCode: 403, message: 'Forbidden: ...' }`.

---

## 4. What We Decided *Not* to Build in Phase 2
- **No Public User Registration**: Staff accounts are pre-provisioned. A public registration form is out of scope and a security vulnerability for private restaurant internal systems.
- **No Phase 3+ Business Entities Yet**: Orders, order lines, menu items, table status, and slow-order alerts are deliberately deferred to their designated future phases to maintain clean separation of concerns and avoid premature coupling.
