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
- **Future Sessions (Planned)**
  - Session 6: Waiter Collaborators & Order Search/Filters/Pagination (Phase 6)
  - Session 7: Bulk Menu Operations, Dashboard Analytics, Audit History & Slow-Order Alerts (Phase 7)

---

## 2. Order of Implementation and Rationale
1. **Authoritative State Machine**: Encapsulated state transition rules in a dedicated state machine service before route wiring to prevent scattered conditional logic.
2. **Atomic Repository Operations & Concurrency**: Implemented atomic conditional updates (`WHERE id = $1 AND status = $2`) preventing race conditions during simultaneous status updates.
3. **Domain Business Rules**: Implemented cancellation boundaries, line voiding with required reason validation, and dynamic total recalculations in `OrderService`.
4. **Backend Automated Tests**: Wrote comprehensive tests covering legal progressions, all invalid transitions, cancellation boundaries, line voiding, and RBAC isolation.
5. **Frontend Lifecycle Controls**: Built state-adapted action buttons, cancel confirmation modal, and line void modal with required reason validation in `OrderList.tsx`.
6. **Frontend Integration Tests**: Validated lifecycle transitions, cancel dialog, line voiding modal, and total recalculation in Vitest.

---

## 3. Estimated vs. Actual Time
- **State Machine & Validators**: Estimated 25m, took ~15m.
- **Backend Service, Repository & Routes**: Estimated 40m, took ~30m.
- **Backend Test Suite (9 new cases)**: Estimated 30m, took ~20m.
- **Frontend Lifecycle UI & Modals**: Estimated 45m, took ~35m.
- **Frontend Test Suite (4 cases)**: Estimated 25m, took ~20m.
- **Documentation & Verification**: Estimated 20m, took ~15m.

---

## 4. What Was Cut or Deferred
- **Collaborator assignments** and multi-waiter editing permissions were deferred to Phase 6.
- **Full-text search, server pagination, and date range filters** were deferred to Phase 7.
- **Audit/history timeline and slow-order alerts** were deferred to Phase 8 and Phase 9.
