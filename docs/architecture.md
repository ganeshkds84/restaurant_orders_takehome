# Architecture

## 1. Moving Pieces and Communication
The application is structured into decoupled frontend, backend, and data tiers:

```
┌────────────────────────────────────────────────────────┐
│                   React 18 + Vite                      │
│   (AuthContext, MenuManagement, SessionView, Header)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST (JSON + Bearer JWT)
┌───────────────────────────▼────────────────────────────┐
│                  Express.js API Layer                  │
│  - Middleware: RequestLogger, Authenticate, RequireRole │
│  - Routers: Health, Auth, MenuRouter, TestRbac         │
│  - Validators: Zod Schemas (create, update, filter)    │
│  - Services: MenuService, AuthService                  │
│  - Repositories: MenuRepository, UserRepository        │
└───────────────────────────┬────────────────────────────┘
                            │ SQL via pg Pool
┌───────────────────────────▼────────────────────────────┐
│                   PostgreSQL Database                  │
│  - users (UUID PK, UNIQUE email, CHECK role)           │
│  - menu_items (UUID PK, NUMERIC price, CHECK >= 0,     │
│    UNIQUE lower(name), availability & archive indexes) │
│  - schema_migrations tracker                           │
└────────────────────────────────────────────────────────┘
```

- **Frontend (Client)**: React 18 single-page application built with Vite and TypeScript. Manages client-side authentication state via `AuthContext`, stores JWT token in `localStorage`, provides live menu catalog & management interface (`MenuManagement`), and handles role-aware presentation.
- **Backend (Server)**: Node.js + Express API in TypeScript. Provides input validation (Zod schemas), centralized error handling (`AppError`), JWT signing/verification, password hashing (`bcryptjs`), and server-side RBAC middleware (`requireRole`, `requireManager`, `requireStaff`).
- **Database (PostgreSQL)**: Stores user accounts with salted password hashes and menu items with exact monetary `NUMERIC(10, 2)` types, case-insensitive uniqueness indexes, and real-time availability/archive flags.

---

## 2. Where Each Piece Runs
- **Client**: Runs in the user's browser, communicating with the API via asynchronous `fetch` requests.
- **Server**: Node.js runtime process (e.g. on port 4000 locally, or deployed on Render/container host).
- **Database**: PostgreSQL 14+ database instance (e.g. port 5432 locally, or managed Supabase/Neon in production).

---

## 3. End-to-End Request Path: Menu Item Mutation

### Example: Manager Updating Price or Toggling Availability (`PATCH /api/menu/:id/availability`)
1. **Client**: The browser sends an HTTP `PATCH` request to `/api/menu/<item_id>/availability` with payload `{ "isAvailable": false }` and header `Authorization: Bearer <jwt_token>`.
2. **CORS & Logging**: `cors()` middleware validates origin; `requestLogger` logs the incoming request method, path, and client IP.
3. **Authentication Middleware (`authenticate`)**:
   - Parses the `Bearer` token from the `Authorization` header.
   - Verifies cryptographic signature and expiration with `JWT_SECRET`.
   - Queries `userRepository.findById(decoded.userId)` to confirm user identity.
   - Attaches sanitized server-verified user to `req.user`.
4. **RBAC Middleware (`requireManager`)**:
   - Reads `req.user.role`.
   - If user is `'waiter'`, immediately halts execution and passes `AppError.forbidden(...)` (HTTP 403) to the centralized error handler.
   - If role is `'manager'`, allows execution to proceed to route handler.
5. **Input Validation**:
   - `updateAvailabilitySchema.safeParse(req.body)` validates that `isAvailable` is a strict boolean.
   - If validation fails, throws `AppError.badRequest('Validation failed', details)` (HTTP 400).
6. **Service Layer (`MenuService.setAvailability`)**:
   - Verifies item existence with `menuRepository.findById(id)`. Throws 404 if missing.
   - Invokes `menuRepository.updateAvailability(id, isAvailable)`.
7. **Repository Layer (`MenuRepository`)**:
   - Executes parameterized query: `UPDATE menu_items SET is_available = $1, updated_at = NOW() WHERE id = $2 RETURNING ...`.
   - Returns updated database row.
8. **Response / Serialization**: Mapped response returned with HTTP 200 `{ status: 'success', message: '...', data: { item } }`.

---

## 4. What We Decided *Not* to Build in Phase 3
- **No Order Management / Order Lines Yet**: Deferred strictly to Phase 4 (Orders & Lifecycle) so menu schemas and availability foundations remain decoupled and rock solid.
- **No Bulk Item Operations Yet**: Bulk batch updates and CSV exports are scheduled for subsequent phases.
- **No Waiter Self-Registration**: Staff accounts remain provisioned strictly through seed scripts and management controls.
