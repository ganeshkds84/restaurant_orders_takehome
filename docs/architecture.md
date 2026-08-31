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
- **Database (PostgreSQL)**: Relational schema modeling users, menu items, orders, and order lines with foreign key constraints (`ON DELETE CASCADE` / `RESTRICT`), check constraints (`quantity > 0`, `price >= 0`), and indexes for frequent lookups.

---

## 2. Where Each Piece Runs
- **Client**: Runs in the user's browser, communicating with the API via asynchronous `fetch` requests.
- **Server**: Node.js runtime process (e.g. on port 4000 locally, or deployed on Render/container host).
- **Database**: PostgreSQL 14+ database instance (e.g. port 5432 locally, or managed Supabase/Neon in production).

---

## 3. End-to-End Request Path: Order Creation (`POST /api/orders`)

### Example: Waiter placing an order for Table 14 with Truffle Fries & Margherita Pizza
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
8. **Response / Serialization**: Mapped order with order lines and authoritative total returned with HTTP 201 `{ status: 'success', data: { order } }`.

---

## 4. What We Decided *Not* to Build in Phase 4
- **No Order Lifecycle Transitions Yet**: Full state progression (*Placed $\to$ Accepted $\to$ Preparing $\to$ Ready $\to$ Served*) and cancellation rules are deferred to Phase 5.
- **No Collaborators Management Yet**: Adding secondary waiters/collaborators to orders is scheduled for Phase 6.
- **No Advanced Search/Filter/Pagination Yet**: Full server-side pagination, date range filtering, and waiter multi-select are scheduled for Phase 7.
- **No Audit/History Timeline Yet**: Immutable event logging is scheduled for Phase 8.
