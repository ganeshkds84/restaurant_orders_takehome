# Project Plan & Session Breakdown

## 1. Session Breakdown

- **Session 1: Foundation & Scaffold (Phase 1)**
  - Established TypeScript Express backend and Vite React frontend monorepo.
  - Configured PostgreSQL connection pooling, centralized error handling, request logging, and health check endpoints.
- **Session 2: Authentication & Server-Side RBAC (Phase 2)**
  - Implemented database schema migration (`001_create_users.sql`) and idempotent migration runner.
  - Implemented secure password hashing with `bcryptjs` and stateless JWT signing/verification.
  - Built `UserRepository`, `AuthService`, and Express middleware (`authenticate`, `requireRole`).
  - Added public and protected endpoints (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/test-rbac/*`).
  - Created frontend `AuthProvider`, `LoginForm`, `UserBadge`, and `SessionDashboard` with live RBAC verification.
  - Wrote automated tests covering 16 backend test cases and 8 frontend test cases.
- **Session 3: Menu Item Management & Availability (Phase 3)**
  - Implemented database schema migration (`002_create_menu_items.sql`) with monetary `NUMERIC(10, 2)` types, non-negative checks, and indexes.
  - Implemented backend data access layer (`MenuRepository`) with in-memory offline fallback for test resilience.
  - Built `MenuService` enforcing dish name uniqueness, soft-archiving rules, and price sanitization.
  - Built REST endpoints under `/api/menu` with Zod validation and server-side RBAC (`requireManager`, `requireStaff`).
  - Built frontend `MenuManagement` component featuring live category filter pills, real-time availability toggle (86'd status), dish creation/edit modals, and role-adapted waiter read-only catalogs.
  - Wrote 19 new backend test cases and 6 new frontend test cases (totaling 51 automated tests).
- **Session 4: Order Creation & Order Lines (Phase 4)**
  - Implemented database schema migration (`003_create_orders_and_order_lines.sql`) with tables `orders` and `order_lines`, relational foreign keys (`CASCADE` / `RESTRICT`), check constraints (`quantity > 0`, `unit_price >= 0`), and lookup indexes.
  - Implemented `OrderRepository` supporting atomic transactions (`BEGIN...COMMIT/ROLLBACK`) and dual-mode in-memory fallback.
  - Implemented `OrderService` with critical historical price snapshotting, dish availability enforcement, and authoritative total calculation.
  - Created REST API endpoints (`POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`) with Zod schema validation and waiter-scoped RBAC.
  - Built frontend `OrderCreation` component with interactive menu picker, quantity adjustments, note instructions, and authoritative total confirmation, and `OrderList` component for active order tickets.
  - Added 16 new automated backend test cases (including the CRITICAL historical price mutation regression test and atomic rollback verification) and 4 new frontend test cases, bringing the repository test total to 71 automated tests across server and client.
- **Session 5: Order Lifecycle & Business Rules (Phase 5)**
  - Implemented authoritative server-side state machine (`order.state-machine.ts`) enforcing the legal transition progression (*Placed $\to$ Accepted $\to$ Preparing $\to$ Ready $\to$ Served*), blocking state skipping, backward transitions, and terminal state modifications.
  - Implemented order cancellation business rules: permitted strictly while an order is `placed` or `accepted`, and rejected once in `preparing`, `ready`, or `served`.
  - Implemented order line voiding: requiring non-empty reasons, marking lines as voided (`is_voided = true`) without physical deletion, and dynamically recalculating authoritative totals from active lines.
  - Implemented adding lines to open orders before served.
  - Added REST lifecycle endpoints (`PATCH /api/orders/:id/status`, `POST /api/orders/:id/cancel`, `POST /api/orders/:id/lines`, `PATCH /api/orders/:id/lines/:lineId/void`).
  - Built interactive frontend lifecycle UI in `OrderList.tsx` with status progression badges, state-adapted action buttons, cancel confirmation modal, and line void modal with reason validation.
  - Added 9 new backend test cases (25 order tests, 62 total backend tests) and 4 new frontend test cases (22 total frontend tests), bringing the repository total to 84 automated tests.
- **Session 6: Collaborators & Order Access (Phase 6)**
  - Implemented database schema migration (`004_create_order_collaborators.sql`) with table `order_collaborators`, `ON DELETE CASCADE` foreign keys, unique constraint `uq_order_collaborators_order_user(order_id, user_id)`, and performance indexes.
  - Implemented `OrderCollaborator` types, `DbOrderCollaborator`, `AddCollaboratorInput`, and `waiterId` filter in `OrderQueryFilters`.
  - Added `findAllByRole(role)` to `UserRepository` and updated test seeds with `waiter2` and `waiter3`.
  - Implemented `addCollaborator`, `removeCollaborator`, `getCollaborators`, and `isCollaborator` in `OrderRepository` with atomic SQL queries and offline dual-mode in-memory stores.
  - Created centralized authorization engine `order.auth.ts` (`canAccessOrder`, `canModifyOrder`, `canManageCollaborators`) strictly enforcing that only primary waiters and managers can manage collaborators, and only assigned collaborators, primary waiters, and managers can access/modify orders.
  - Built collaborator endpoints (`GET /api/orders/eligible-waiters`, `GET /api/orders/:id/collaborators`, `POST /api/orders/:id/collaborators`, `DELETE /api/orders/:id/collaborators/:userId`) and integrated authorization across all order routes.
  - Built frontend collaborator UI in `OrderList.tsx` with Primary Waiter / Collaborator badges, expanded card Collaborators panel with team tags and remove buttons, and an Add Collaborator modal with eligible waiter dropdown.
- **Session 7: Order Finding / Search, Filter, Sort & Server-Side Pagination (Phase 7)**
  - Implemented server-side text search over table numbers (`search` with `ILIKE` pattern matching).
  - Implemented multi-criteria filtering by order status (`status`), waiter ID (`waiterId` matching primary waiter or assigned collaborator), and calendar date (`date` with `YYYY-MM-DD`).
  - Implemented multi-field server-side sorting by placed time (`createdAt`), status (`status`), and table number (`tableNumber`), supporting ascending and descending directions with deterministic tiebreakers.
  - Implemented server-side pagination with query parameters `page` ($\ge 1$) and `limit` ($1..100$), returning total count, page number, limit, and computed `totalPages`.
  - Enforced strict server-side access scoping: Waiters can only search and filter within orders where they are the primary waiter or an assigned collaborator (`accessibleWaiterId`).
  - Built comprehensive query validation in `orderQuerySchema` using Zod.
  - Built frontend Search & Filter Toolbar in `OrderList.tsx` with responsive grid inputs for table search, status filter, waiter filter (populated from eligible waitstaff), date picker, sort controls, and a reset filters button.
  - Built frontend pagination controls displaying "Showing X to Y of Z orders", page navigation buttons (Previous/Next), and page size selector.
  - Created 17 new backend automated test cases (`tests/order-search.test.ts`) and 6 new frontend test cases (`tests/OrderSearch.test.tsx`), bringing total test suite to 138 passing automated tests (106 backend, 32 frontend).
- **Future Sessions (Planned)**
  - Session 8: Bulk Menu Operations & CSV Export, Dashboard Analytics & Audit Timeline (Phase 8)
  - Session 9: Slow-Order Alert System (Phase 9)

---

## 2. Order of Implementation and Rationale
1. **Server Types & Zod Validator**: Defined query filter interfaces and Zod schema with string normalization, coercion, and allowlist validation first.
2. **Repository & Service Layer**: Implemented `findPaginated` in `OrderRepository` with atomic parameterized SQL queries and dual-mode in-memory fallback, and updated `OrderService.listOrders` to enforce caller role scoping.
3. **Route Integration**: Updated `GET /api/orders` to return paginated response structure with `orders`, `total`, `page`, `limit`, `totalPages`, and `count`.
4. **Backend Automated Tests**: Created 17 tests in `tests/order-search.test.ts` validating all search, filter, sort, pagination, access scoping, and validation permutations.
5. **Frontend Services & UI**: Extended `fetchOrdersApi` and built the responsive Search & Filter toolbar and pagination footer in `OrderList.tsx`.
6. **Frontend Integration Tests**: Validated UI rendering, search/filter inputs, sort options, reset buttons, and pagination controls in `client/tests/OrderSearch.test.tsx`.


---

## 3. Estimated vs. Actual Time
- **Database Migration & Types**: Estimated 20m, took ~15m.
- **Backend Service, Repository & Auth**: Estimated 45m, took ~35m.
- **Backend Test Suite (27 test cases)**: Estimated 40m, took ~30m.
- **Frontend UI & Modal**: Estimated 45m, took ~35m.
- **Frontend Test Suite (4 test cases)**: Estimated 25m, took ~20m.
- **Documentation & Verification**: Estimated 20m, took ~15m.

---

## 4. What Was Cut or Deferred
- **Advanced search/filter/sort and server-side pagination** were deferred to Phase 7.
- **Bulk menu actions and daily CSV export** were deferred to Phase 7.
- **Dashboard analytics and audit/history timeline** were deferred to Phase 8.
- **Slow-order alerts** were deferred to Phase 9.

