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

### D. Order Finding, Search, Filtering, Sorting & Pagination (`GET /api/orders`)
1. **Client**: User types table search, selects status/waiter/date filters, picks sort order, or navigates pages. The browser sends `GET /api/orders?search=...&status=...&waiterId=...&date=...&sortBy=...&sortOrder=...&page=...&limit=...` with the `Authorization: Bearer <token>` header.
2. **Authentication & Access Scoping**:
   - `authenticate` middleware verifies JWT token and extracts `req.user`.
   - `OrderService.listOrders` checks caller role:
     - For `role === 'waiter'`: Caller's access scope is strictly locked to orders where they are the primary waiter OR an assigned collaborator (`accessibleWaiterId = user.id`). Query parameters supplied by the client cannot widen or bypass this boundary.
     - For `role === 'manager'`: Manager has restaurant-wide order access.
3. **Query Validation (`orderQuerySchema`)**:
   - Validates search string length ($\le 50$), enum status, UUID regex for `waiterId`, ISO date format `^\d{4}-\d{2}-\d{2}$`, sort field allowlist (`createdAt`, `status`, `tableNumber`), sort direction (`asc`/`desc`), and numeric ranges for `page` ($\ge 1$) and `limit` ($1 \le \text{limit} \le 100$).
4. **Repository Execution (`OrderRepository.findPaginated`)**:
   - Constructs safe parameterized SQL conditions for filtering and searching.
   - Executes `SELECT COUNT(DISTINCT o.id)::int AS total FROM orders o ...` for total match count.
   - Executes `SELECT ... FROM orders o ... ORDER BY <allowlisted_column> <ASC/DESC>, o.id DESC LIMIT $limit OFFSET $offset`.
   - Performs batch loading of associated `order_lines` and `order_collaborators` for the paginated slice.
5. **Response**: Returns HTTP 200 with `{ status: 'success', data: { orders, total, page, limit, totalPages, count } }`.

### E. Bulk Menu Item Operations (`POST /api/menu/bulk`)
1. **Client**: Manager selects multiple menu items in `MenuManagement`, picks a bulk action (Price update or Availability change), enters inputs, and sends `POST /api/menu/bulk`.
2. **Authentication & Authorization**:
   - `authenticate` middleware verifies JWT token.
   - `requireManager` middleware ensures strictly users with `role === 'manager'` can trigger bulk mutations. Waiters are rejected with `403 Forbidden`.
3. **Validation & Partial Batch Execution (`MenuService.bulkUpdateMenuItems`)**:
   - Validates bulk action payload.
   - Iterates through each targeted item ID independently.
   - For each valid item, applies the update in PostgreSQL and records a success result.
   - For invalid items (e.g. non-existent ID, negative price, invalid decimal precision), records a failure result with a descriptive error message without failing or rolling back valid items in the selection.
4. **Response**: Returns HTTP 200 with `{ status: 'success', data: { results: [{ itemId, name, success, message, error }], summary: { total, succeeded, failed } } }`.

### F. Daily Orders CSV Export (`GET /api/orders/export/csv`)
1. **Client**: User triggers CSV export from `OrderList` or navigation for a specific date (or today's date).
2. **Backend Execution (`order.csv.service.ts`)**:
   - Authenticates staff caller (`requireStaff`).
   - Fetches all orders placed on that calendar date with lines, totals, and primary waiter info via `OrderService.listOrders`.
   - Serializes data into standard RFC 4180-compliant CSV text with proper quote escaping.
3. **Response**: Sets headers `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="orders-YYYY-MM-DD.csv"` and streams the CSV file.

### G. Dashboard Operations & Analytics (`GET /api/dashboard/stats`)
1. **Client**: User visits the application or switches to the Dashboard tab. Browser sends `GET /api/dashboard/stats` (with optional `?date=YYYY-MM-DD`) and `Authorization: Bearer <token>`.
2. **Authentication & Authorization**:
   - `authenticate` verifies JWT token.
   - `requireStaff` ensures valid restaurant staff (managers and waiters) can access operational metrics.
3. **Service & Repository Execution (`DashboardService` & `DashboardRepository`)**:
   - Executes authoritative PostgreSQL aggregations:
     - **Headline Numbers**: `openOrders` (statuses `placed`, `accepted`, `preparing`, `ready`, non-archived), `ordersPlacedToday` (`created_at::date = CURRENT_DATE`), `ordersServedToday` (`status = 'served'` today), and `revenueToday` (`SUM(total_price)` of served orders today).
     - **Status Breakdown**: `SELECT status, COUNT(*)::int FROM orders WHERE is_archived = FALSE GROUP BY status` mapped across all 6 lifecycle statuses.
     - **Waiter Breakdown**: `users` left joined with `orders` grouped by waiter ID, returning order counts and total non-cancelled revenue.
     - **14-Day Served Chart**: Date series over the last 14 calendar days joined with served orders, returning chronologically ascending daily counts.
4. **Response**: Returns HTTP 200 with `{ status: 'success', data: { headline, statusBreakdown, waiterBreakdown, dailyServedChart } }`.

---

### H. Order Audit History Timeline (`GET /api/orders/:id/timeline`)
1. **Client**: User expands an order ticket in `OrderList` and toggles "Order History Timeline". Browser sends `GET /api/orders/:id/timeline` (or `GET /api/orders/:id/history`) with `Authorization: Bearer <token>`.
2. **Authentication & Authorization**:
   - `authenticate` verifies JWT token.
   - `requireStaff` ensures caller is an authenticated staff member.
   - `canAccessOrder(user, order)` in `order.auth.ts` verifies:
     - Managers have restaurant-wide audit visibility across all tables.
     - Waiters can view timelines strictly for orders where they are the primary waiter or an assigned collaborator.
     - Unassigned waiters receive `403 Forbidden`.
3. **Immutability & Transactional Logging Architecture**:
   - **Zero Modification Endpoints**: The server does NOT expose any `PUT`, `PATCH`, or `DELETE` endpoints for timeline events. Audit entries are strictly append-only.
   - **Coupled Transactional Writes**: All order mutations (`createOrderWithLines`, `updateOrderStatus`, `cancelOrder`, `addOrderLine`, `voidOrderLine`, `addCollaborator`, `removeCollaborator`) record corresponding audit rows within the same atomic transaction block. If an operation fails or is rejected, no phantom audit event is recorded.
   - **Server-Authoritative Identity**: The caller's `actor_id`, `actor_name`, and `actor_role` are snapshotted from the authenticated JWT session (`req.user`), completely immune to client payload tampering.
4. **Repository Execution (`OrderRepository.getOrderTimeline`)**:
   - Executes `SELECT * FROM order_audit_events WHERE order_id = $1 ORDER BY created_at ASC` backed by compound index `idx_order_audit_events_order_created(order_id, created_at ASC)`.
5. **Response**: Returns HTTP 200 with `{ status: 'success', data: { timeline: OrderAuditEvent[] } }`.

---

## 4. What We Decided *Not* to Build in Phase 10
- **No Slow-Order Alerts Yet**: Background threshold alerting and alert acknowledgement are scheduled for Phase 11 / Goal 10.
