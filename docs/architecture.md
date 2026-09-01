# Architecture

## 1. Moving Pieces and Communication
The application is structured into decoupled frontend, backend, and data tiers:

```
┌────────────────────────────────────────────────────────┐
│                   React 18 + Vite                      │
│   (AuthContext, OrderCreation, OrderList, Menu, Header)│
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST (JSON + Bearer JWT)
┌───────────────────────────▼────────────────────────────┐
│                  Express.js API Layer                  │
│  - Middleware: RequestLogger, Authenticate, RequireRole │
│  - Routers: Health, Auth, MenuRouter, OrderRouter       │
│  - Validators: Zod Schemas (create, update, query)     │
│  - Services: OrderService, MenuService, AuthService    │
│  - Repositories: OrderRepository, MenuRepo, UserRepo   │
└───────────────────────────┬────────────────────────────┘
                            │ SQL / Transactions via pg Pool
┌───────────────────────────▼────────────────────────────┐
│                   PostgreSQL Database                  │
│  - users (UUID PK, UNIQUE email, CHECK role)           │
│  - menu_items (UUID PK, NUMERIC price, CHECK >= 0,     │
│    UNIQUE lower(name), availability & archive indexes) │
│  - orders (UUID PK, table_number, primary_waiter_id,   │
│    status 'placed', total_price, archived)             │
│  - order_lines (UUID PK, order_id FK, menu_item_id FK, │
│    quantity > 0, unit_price snapshot, item_name, notes)│
│  - schema_migrations tracker                           │
└────────────────────────────────────────────────────────┘
```

- **Frontend (Client)**: React 18 single-page application built with Vite and TypeScript. Manages client-side authentication state via `AuthContext`, stores JWT token in `localStorage`, provides interactive order ticket creation (`OrderCreation`) and order queue retrieval (`OrderList`), along with live menu catalog & management interface (`MenuManagement`).
- **Backend (Server)**: Node.js + Express API in TypeScript. Provides input validation (Zod schemas), centralized error handling (`AppError`), atomic PostgreSQL transactions (`BEGIN...COMMIT/ROLLBACK`), historical price snapshotting on line item creation, JWT verification, and server-side RBAC scoping (`requireRole`, `requireManager`, `requireStaff`).
- **Database (PostgreSQL)**: Relational schema modeling users, menu items, orders, order lines, and order collaborators (`order_collaborators`) with foreign key constraints (`ON DELETE CASCADE` / `RESTRICT`), check constraints (`quantity > 0`, `price >= 0`), uniqueness constraints (`uq_order_collaborators_order_user`), and indexes for frequent lookups.

---

## 2. Where Each Piece Runs
- **Client**: Runs in the user's browser, communicating with the API via asynchronous `fetch` requests.
- **Server**: Node.js runtime process (e.g. on port 4000 locally, or deployed on Render/container host).
- **Database**: PostgreSQL 14+ database instance (e.g. port 5432 locally, or managed Supabase/Neon in production).

---

## 3. End-to-End Request Path: Order Collaboration & Access

### A. Order Creation (`POST /api/orders`)
1. **Client**: The waiter enters table number "Table 14", selects dishes with quantities, adds special instructions ("Extra crispy"), and clicks "Send Order to Kitchen". Browser sends `POST /api/orders` with authorization header and JSON payload containing `tableNumber` and `items: [{ menuItemId, quantity, specialInstructions }]`.
2. **CORS & Logging**: `cors()` middleware validates origin; `requestLogger` logs the incoming request method, path, and client IP.
3. **Authentication Middleware (`authenticate`)**:
   - Parses the `Bearer` token from the `Authorization` header.
   - Verifies cryptographic signature and expiration with `JWT_SECRET`.
   - Queries `userRepository.findById(decoded.userId)` to confirm user identity.
   - Attaches sanitized server-verified user to `req.user`.
4. **RBAC Middleware (`requireStaff`)**:
   - Validates that caller has role `'waiter'` or `'manager'`.
5. **Input Validation**:
   - `createOrderSchema.safeParse(req.body)` validates that `tableNumber` is non-empty and `items` is an array of at least 1 item with valid UUIDs and positive integer quantities $\ge 1$.
6. **Service Layer (`OrderService.createOrder`)**:
   - Resolves all requested menu items from the database.
   - Verifies each menu item exists, is not archived, and is currently available (`is_available = true`). Throws 400 if any item is missing or 86ed.
   - Reads the current `price` and `name` from each menu item to lock in historical snapshots.
   - Calculates the authoritative total using exact decimal arithmetic: $\text{total} = \sum (\text{unitPrice} \times \text{quantity})$.
7. **Repository Layer with Atomic Transaction (`OrderRepository.createOrderWithLines`)**:
   - Acquires PostgreSQL connection from pool and issues `BEGIN`.
   - Inserts row into `orders` with server-derived `primary_waiter_id` and initial status `'placed'`.
   - Inserts each row into `order_lines` with historical `unit_price`, `item_name`, and `special_instructions`.
   - Issues `COMMIT` if all rows succeed, or `ROLLBACK` on any error (guaranteeing zero partial orders).
8. **Response / Serialization**: Mapped order with order lines, primary waiter info, empty collaborators array, and authoritative total returned with HTTP 201 `{ status: 'success', data: { order } }`.

### B. Adding a Collaborator (`POST /api/orders/:id/collaborators`)
1. **Client**: Primary waiter or manager opens "Add Collaborator" modal, selects a waiter from the eligible waitstaff list, and clicks "Assign Collaborator". Client sends `POST /api/orders/:id/collaborators` with `{ "userId": "<target_waiter_uuid>" }`.
2. **Authentication & Authorization (`order.auth.ts`)**:
   - `authenticate` resolves caller.
   - `canManageCollaborators(user, order)` checks that caller is either the `primary_waiter_id` or has role `'manager'`. If caller is an unassigned waiter or a secondary collaborator, server rejects with `403 Forbidden`.
3. **Business Validation**:
   - Verifies target user exists in database and holds role `'waiter'`.
   - Verifies target user is not already the primary waiter on this order.
   - Verifies target user is not already assigned as a collaborator on this order.
4. **Persistence**:
   - Inserts row into `order_collaborators (order_id, user_id)` protected by database `UNIQUE(order_id, user_id)` constraint.
5. **Response**: Returns 201 Created with sanitized collaborator record (`id`, `orderId`, `userId`, `user: { id, name, email, role }`, `createdAt`).

### C. Collaborator Order Access & Lifecycle Operations
1. **Order Listing (`GET /api/orders`)**:
   - When a waiter queries the orders endpoint, the query is scoped with `(o.primary_waiter_id = $userId OR o.id IN (SELECT order_id FROM order_collaborators WHERE user_id = $userId))`.
   - The waiter sees all orders they created (as primary waiter) PLUS all orders where they are an assigned collaborator.
2. **Order Actions (`status`, `cancel`, `lines`, `void`)**:
   - Authorized collaborators can transition status (`PATCH /api/orders/:id/status`), cancel while placed/accepted (`POST /api/orders/:id/cancel`), add line items (`POST /api/orders/:id/lines`), and void lines (`PATCH /api/orders/:id/lines/:lineId/void`).
   - Unassigned waiters are rejected with `403 Forbidden`.
3. **Collaborator Removal (`DELETE /api/orders/:id/collaborators/:userId`)**:
   - When removed by the primary waiter or manager, the collaborator junction row is deleted, and their access to view or modify the order is revoked immediately.

---

## 4. What We Decided *Not* to Build in Phase 6
- **No Advanced Search/Filter/Sort/Pagination Yet**: Full server-side table search, status/waiter/date filters, multi-column sorting, and pagination metadata are scheduled for Phase 7.
- **No Bulk Actions or CSV Export Yet**: Bulk menu item changes and daily CSV order export are scheduled for Phase 7.
- **No Dashboard Analytics Yet**: Landing metrics and 14-day served charts are scheduled for Phase 8.
- **No Immutable Audit/History Timeline Yet**: Audit event tracking is scheduled for Phase 8.
- **No Slow-Order Alerts Yet**: Background threshold alerts and alert acknowledgement are scheduled for Phase 9.

